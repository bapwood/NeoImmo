import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlockchainOperationStatus,
  BlockchainOperationType,
  Prisma,
  TokenizationStatus,
  WalletStatus,
} from '@prisma/client';
import {
  Contract,
  getBytes,
  HDNodeWallet,
  isAddress,
  JsonRpcProvider,
  keccak256,
  MaxUint256,
  parseUnits,
  verifyTypedData,
  Wallet,
} from 'ethers';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MARKETPLACE_TYPES, KYC_REGISTRY_ABI, PROPERTY_FACTORY_ABI, PROPERTY_SHARES_ABI, TRANSFER_GATE_ABI } from './blockchain.constants';
import { ExecutePrimaryBuyDto } from './dto/execute-primary-buy.dto';
import { MintPropertyInventoryDto } from './dto/mint-property-inventory.dto';
import { PreparePrimaryBuyDto } from './dto/prepare-primary-buy.dto';
import { SetBlockedCountryDto } from './dto/set-blocked-country.dto';
import { SetBlocklistDto } from './dto/set-blocklist.dto';
import { SyncWalletKycDto } from './dto/sync-wallet-kyc.dto';

type PropertyWithKeyPoints = Prisma.PropertyGetPayload<{
  include: {
    keyPoints: true;
  };
}>;

type DeploymentManifest = {
  network: string;
  chainId: number;
  deployedAt: string;
  backendOperator: {
    address: string;
    accountIndex: number;
  };
  treasury: {
    address: string;
    accountIndex: number;
  };
  contracts: {
    kycRegistry: string | null;
    transferGate: string | null;
    propertyFactory: string | null;
  };
};

type MarketplaceMessage = {
  action: 'BUY';
  wallet: string;
  to: string;
  propertyAddress: string;
  amount: string;
  price: string;
  currency: string;
  nonce: string;
  deadline: string;
};

type PreparedMarketplacePayload = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: typeof MARKETPLACE_TYPES;
  message: MarketplaceMessage;
};

@Injectable()
export class BlockchainService {
  private provider: JsonRpcProvider | null = null;
  private backendWallet: Wallet | HDNodeWallet | null = null;
  private treasuryWallet: Wallet | HDNodeWallet | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getHealth() {
    const manifest = await this.getDeploymentManifest();
    const deploymentsPath = this.getDeploymentsFilePath();
    const enabled = this.isBlockchainEnabled();

    try {
      const provider = this.getProvider();
      const [network, backendWallet, treasuryWallet] = await Promise.all([
        provider.getNetwork(),
        Promise.resolve(this.getBackendWallet()),
        Promise.resolve(this.getTreasuryWallet()),
      ]);
      const contracts = await this.resolveContractAddresses();

      return {
        enabled,
        ready: true,
        deploymentsPath,
        provider: {
          rpcUrl: this.getRpcUrl(),
          chainId: Number(network.chainId),
        },
        wallets: {
          backendOperator: backendWallet.address,
          treasury: treasuryWallet.address,
        },
        contracts,
        manifest,
      };
    } catch (error) {
      return {
        enabled,
        ready: false,
        deploymentsPath,
        manifest,
        error: error instanceof Error ? error.message : 'Blockchain unavailable.',
      };
    }
  }

  async getPropertyMetadata(propertyId: number) {
    const property = await this.getPropertyForBlockchain(propertyId);
    const payload = await this.getStoredOrFreshMetadataPayload(property);

    return {
      ...payload,
      integrity: {
        hash: property.metadataHash ?? payload.integrity.hash,
        signature: property.metadataSignature ?? payload.integrity.signature,
        signer: this.getBackendWallet().address,
      },
    };
  }

  async bootstrapSystemWallets() {
    this.ensureBlockchainEnabled();

    const defaultCountryCode = this.getDefaultCountryCode();
    const backendAddress = this.getBackendWallet().address;
    const treasuryAddress = this.getTreasuryWallet().address;

    const backendResult = await this.syncWalletKycOnChain({
      walletAddress: backendAddress,
      countryCode: defaultCountryCode,
      allowed: true,
    });
    const treasuryResult = await this.syncWalletKycOnChain({
      walletAddress: treasuryAddress,
      countryCode: defaultCountryCode,
      allowed: true,
    });

    return {
      backendOperator: backendResult,
      treasury: treasuryResult,
    };
  }

  async syncUserKyc(userId: number) {
    this.ensureBlockchainEnabled();

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    if (!user.walletAddress) {
      throw new BadRequestException('Aucune wallet renseignée pour cet utilisateur.');
    }

    if (!user.countryCode) {
      throw new BadRequestException('Aucun code pays ISO renseigné pour cet utilisateur.');
    }

    const requestId = randomUUID();
    const operation = await this.prisma.blockchainOperation.create({
      data: {
        requestId,
        type: BlockchainOperationType.SYNC_WALLET_KYC,
        status: BlockchainOperationStatus.SUBMITTED,
        userId: user.id,
        toWallet: user.walletAddress,
        payload: {
          countryCode: user.countryCode,
          allowed: true,
        } satisfies Prisma.JsonObject,
      },
    });

    try {
      const result = await this.syncWalletKycOnChain({
        walletAddress: user.walletAddress,
        countryCode: user.countryCode,
        allowed: true,
      });

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            walletStatus: WalletStatus.VERIFIED,
            walletVerifiedAt: new Date(),
            kycSyncedAt: new Date(),
          },
        }),
        this.prisma.blockchainOperation.update({
          where: {
            id: operation.id,
          },
          data: {
            status: BlockchainOperationStatus.CONFIRMED,
            txHash: result.countryTxHash,
            payload: {
              countryCode: user.countryCode,
              allowed: true,
              allowTxHash: result.allowTxHash,
              countryTxHash: result.countryTxHash,
            } satisfies Prisma.JsonObject,
          },
        }),
      ]);

      return {
        requestId,
        ...result,
      };
    } catch (error) {
      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'KYC sync failed.',
        },
      });
      throw error;
    }
  }

  async syncWalletKyc(payload: SyncWalletKycDto) {
    this.ensureBlockchainEnabled();

    const requestId = randomUUID();
    const operation = await this.prisma.blockchainOperation.create({
      data: {
        requestId,
        type: BlockchainOperationType.SYNC_WALLET_KYC,
        status: BlockchainOperationStatus.SUBMITTED,
        toWallet: payload.walletAddress,
        payload: {
          countryCode: payload.countryCode,
          allowed: payload.allowed ?? true,
        } satisfies Prisma.JsonObject,
      },
    });

    try {
      const result = await this.syncWalletKycOnChain(payload);

      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.CONFIRMED,
          txHash: result.countryTxHash,
          payload: {
            countryCode: payload.countryCode,
            allowed: payload.allowed ?? true,
            allowTxHash: result.allowTxHash,
            countryTxHash: result.countryTxHash,
          } satisfies Prisma.JsonObject,
        },
      });

      return {
        requestId,
        ...result,
      };
    } catch (error) {
      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Wallet KYC sync failed.',
        },
      });
      throw error;
    }
  }

  async setBlocklist(payload: SetBlocklistDto) {
    this.ensureBlockchainEnabled();
    const requestId = randomUUID();
    const operation = await this.prisma.blockchainOperation.create({
      data: {
        requestId,
        type: BlockchainOperationType.SET_BLOCKLIST,
        status: BlockchainOperationStatus.SUBMITTED,
        toWallet: payload.walletAddress,
        payload: {
          blocked: payload.blocked,
        } satisfies Prisma.JsonObject,
      },
    });

    try {
      const transferGate = new Contract(
        (await this.resolveContractAddresses()).transferGate,
        TRANSFER_GATE_ABI,
        this.getBackendWallet(),
      );
      const tx = await transferGate.setBlocklist(payload.walletAddress, payload.blocked);
      await tx.wait();

      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.CONFIRMED,
          txHash: tx.hash,
        },
      });

      return {
        requestId,
        txHash: tx.hash,
      };
    } catch (error) {
      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Blocklist update failed.',
        },
      });
      throw error;
    }
  }

  async setBlockedCountry(payload: SetBlockedCountryDto) {
    this.ensureBlockchainEnabled();
    const requestId = randomUUID();
    const operation = await this.prisma.blockchainOperation.create({
      data: {
        requestId,
        type: BlockchainOperationType.SET_BLOCKED_COUNTRY,
        status: BlockchainOperationStatus.SUBMITTED,
        payload: {
          countryCode: payload.countryCode,
          blocked: payload.blocked,
        } satisfies Prisma.JsonObject,
      },
    });

    try {
      const transferGate = new Contract(
        (await this.resolveContractAddresses()).transferGate,
        TRANSFER_GATE_ABI,
        this.getBackendWallet(),
      );
      const tx = await transferGate.setBlockedCountry(
        this.countryCodeToBytes2(payload.countryCode),
        payload.blocked,
      );
      await tx.wait();

      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.CONFIRMED,
          txHash: tx.hash,
        },
      });

      return {
        requestId,
        txHash: tx.hash,
      };
    } catch (error) {
      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Blocked country update failed.',
        },
      });
      throw error;
    }
  }

  async deployPropertyToken(propertyId: number) {
    this.ensureBlockchainEnabled();

    const property = await this.getPropertyForBlockchain(propertyId);

    if (property.contractAddress) {
      throw new BadRequestException('Ce bien possède déjà un contrat déployé.');
    }

    const contracts = await this.resolveContractAddresses();
    const backendWallet = this.getBackendWallet();
    const treasuryWallet = this.getTreasuryWallet();
    const metadata = await this.buildSignedMetadataPayload(property);
    const symbol = this.buildPropertySymbol(property.name, property.id);
    const requestId = randomUUID();

    const operation = await this.prisma.blockchainOperation.create({
      data: {
        requestId,
        type: BlockchainOperationType.DEPLOY_PROPERTY,
        status: BlockchainOperationStatus.SUBMITTED,
        propertyId: property.id,
        payload: metadata as unknown as Prisma.InputJsonValue,
      },
    });

    try {
      const propertyFactory = new Contract(
        contracts.propertyFactory,
        PROPERTY_FACTORY_ABI,
        backendWallet,
      );

      const createProperty = propertyFactory.getFunction('createProperty');
      const tokenAddress = await createProperty.staticCall(
        property.name,
        symbol,
        metadata.metadataUri,
        metadata.integrity.hash,
      );
      const tx = await createProperty(
        property.name,
        symbol,
        metadata.metadataUri,
        metadata.integrity.hash,
      );
      await tx.wait();

      const updatedProperty = await this.prisma.property.update({
        where: {
          id: property.id,
        },
        data: {
          symbol,
          contractAddress: tokenAddress,
          chainId: contracts.chainId,
          metadataUri: metadata.metadataUri,
          metadataHash: metadata.integrity.hash,
          metadataSignature: metadata.integrity.signature,
          deployTxHash: tx.hash,
          tokenizationStatus: TokenizationStatus.DEPLOYED,
          treasuryWalletAddress: treasuryWallet.address,
          backendOperatorWalletAddress: backendWallet.address,
          tokenDecimals: 18,
        },
      });

      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.CONFIRMED,
          txHash: tx.hash,
          toWallet: tokenAddress,
          chainId: contracts.chainId,
        },
      });

      return updatedProperty;
    } catch (error) {
      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Property deployment failed.',
        },
      });
      throw error;
    }
  }

  async mintPropertyInventory(propertyId: number, payload: MintPropertyInventoryDto) {
    this.ensureBlockchainEnabled();

    const property = await this.getPropertyForBlockchain(propertyId);

    if (!property.contractAddress) {
      throw new BadRequestException('Le bien doit être déployé avant le mint.');
    }

    await this.bootstrapSystemWallets();

    const amount = payload.amount?.trim() || String(property.tokenNumber);
    const decimals = property.tokenDecimals ?? 18;
    const parsedAmount = parseUnits(amount, decimals);
    const treasuryWallet = this.getTreasuryWallet();
    const tokenContract = new Contract(
      property.contractAddress,
      PROPERTY_SHARES_ABI,
      this.getBackendWallet(),
    );
    const requestId = randomUUID();
    const operation = await this.prisma.blockchainOperation.create({
      data: {
        requestId,
        type: BlockchainOperationType.MINT_PROPERTY,
        status: BlockchainOperationStatus.SUBMITTED,
        propertyId: property.id,
        toWallet: treasuryWallet.address,
        amount,
      },
    });

    try {
      const tx = await tokenContract.mint(treasuryWallet.address, parsedAmount);
      await tx.wait();

      await this.ensureTreasuryAllowance(property.contractAddress, parsedAmount);

      await this.prisma.$transaction([
        this.prisma.property.update({
          where: {
            id: property.id,
          },
          data: {
            tokenizationStatus: TokenizationStatus.ACTIVE,
            treasuryWalletAddress: treasuryWallet.address,
            backendOperatorWalletAddress: this.getBackendWallet().address,
          },
        }),
        this.prisma.blockchainOperation.update({
          where: {
            id: operation.id,
          },
          data: {
            status: BlockchainOperationStatus.CONFIRMED,
            txHash: tx.hash,
          },
        }),
      ]);

      return {
        requestId,
        txHash: tx.hash,
        toWallet: treasuryWallet.address,
        amount,
      };
    } catch (error) {
      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Property mint failed.',
        },
      });
      throw error;
    }
  }

  async preparePrimaryBuy(payload: PreparePrimaryBuyDto) {
    this.ensureBlockchainEnabled();

    const property = await this.getPropertyForBlockchain(payload.propertyId);
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    if (!user.walletAddress) {
      throw new BadRequestException('La wallet du client est manquante.');
    }

    if (!property.contractAddress) {
      throw new BadRequestException('Le bien n’est pas encore déployé on-chain.');
    }

    const treasuryWallet = this.getTreasuryWallet();
    const tokenContract = new Contract(
      property.contractAddress,
      PROPERTY_SHARES_ABI,
      this.getProvider(),
    );
    const amountAsUnits = parseUnits(payload.amount, property.tokenDecimals ?? 18);
    const balance = await tokenContract.balanceOf(treasuryWallet.address);

    if (balance < amountAsUnits) {
      throw new BadRequestException('La trésorerie ne détient pas assez de tokens pour cette vente.');
    }

    const contracts = await this.resolveContractAddresses();
    const requestId = randomUUID();
    const nonce = String(Date.now());
    const deadline =
      payload.deadlineMinutes && payload.deadlineMinutes > 0
        ? String(Math.floor(Date.now() / 1000) + payload.deadlineMinutes * 60)
        : '0';
    const marketplacePayload: PreparedMarketplacePayload = {
      domain: {
        name: 'RealEstateMarketplace',
        version: '1',
        chainId: contracts.chainId,
        verifyingContract: property.contractAddress,
      },
      types: MARKETPLACE_TYPES,
      message: {
        action: 'BUY',
        wallet: user.walletAddress,
        to: user.walletAddress,
        propertyAddress: property.contractAddress,
        amount: payload.amount,
        price: payload.price,
        currency: payload.currency?.trim() || 'EUR',
        nonce,
        deadline,
      },
    };

    await this.prisma.blockchainOperation.create({
      data: {
        requestId,
        type: BlockchainOperationType.PREPARE_PRIMARY_BUY,
        status: BlockchainOperationStatus.PREPARED,
        chainId: contracts.chainId,
        propertyId: property.id,
        userId: user.id,
        fromWallet: treasuryWallet.address,
        toWallet: user.walletAddress,
        amount: payload.amount,
        price: payload.price,
        currency: marketplacePayload.message.currency,
        nonce,
        deadline: deadline === '0' ? null : new Date(Number(deadline) * 1000),
        payload: marketplacePayload as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      requestId,
      ...marketplacePayload,
    };
  }

  async executePrimaryBuy(payload: ExecutePrimaryBuyDto) {
    this.ensureBlockchainEnabled();

    const operation = await this.prisma.blockchainOperation.findUnique({
      where: {
        requestId: payload.requestId,
      },
      include: {
        property: true,
        user: true,
      },
    });

    if (!operation || !operation.property || !operation.user) {
      throw new NotFoundException('La demande préparée est introuvable.');
    }

    if (!operation.payload || typeof operation.payload !== 'object') {
      throw new BadRequestException('Le payload de marché préparé est invalide.');
    }

    const prepared = operation.payload as unknown as PreparedMarketplacePayload;
    const recoveredWallet = verifyTypedData(
      prepared.domain,
      prepared.types,
      prepared.message,
      payload.signature,
    );

    if (recoveredWallet.toLowerCase() !== prepared.message.wallet.toLowerCase()) {
      throw new BadRequestException('Signature EIP-712 invalide.');
    }

    if (prepared.message.deadline !== '0') {
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (BigInt(prepared.message.deadline) < now) {
        throw new BadRequestException('La signature a expiré.');
      }
    }

    if (!operation.property.contractAddress) {
      throw new BadRequestException('Le bien n’est pas déployé on-chain.');
    }

    await this.bootstrapSystemWallets();
    await this.syncUserKyc(operation.user.id);

    const treasuryWallet = this.getTreasuryWallet();
    const tokenContract = new Contract(
      operation.property.contractAddress,
      PROPERTY_SHARES_ABI,
      this.getBackendWallet(),
    );
    const amount = parseUnits(
      prepared.message.amount,
      operation.property.tokenDecimals ?? 18,
    );

    await this.ensureTreasuryAllowance(operation.property.contractAddress, amount);

    await this.prisma.blockchainOperation.update({
      where: {
        id: operation.id,
      },
      data: {
        type: BlockchainOperationType.EXECUTE_PRIMARY_BUY,
        status: BlockchainOperationStatus.SUBMITTED,
        signature: payload.signature,
      },
    });

    try {
      const tx = await tokenContract.transferFrom(
        treasuryWallet.address,
        prepared.message.to,
        amount,
      );
      await tx.wait();

      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.CONFIRMED,
          txHash: tx.hash,
          signature: payload.signature,
        },
      });

      return {
        requestId: payload.requestId,
        txHash: tx.hash,
      };
    } catch (error) {
      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.FAILED,
          signature: payload.signature,
          errorMessage: error instanceof Error ? error.message : 'Primary buy execution failed.',
        },
      });
      throw error;
    }
  }

  private async syncWalletKycOnChain(payload: SyncWalletKycDto) {
    const contracts = await this.resolveContractAddresses();
    const kycRegistry = new Contract(
      contracts.kycRegistry,
      KYC_REGISTRY_ABI,
      this.getBackendWallet(),
    );
    const allowTx = await kycRegistry.setAllowed(
      payload.walletAddress,
      payload.allowed ?? true,
    );
    await allowTx.wait();

    const countryTx = await kycRegistry.setCountry(
      payload.walletAddress,
      this.countryCodeToBytes2(payload.countryCode),
    );
    await countryTx.wait();

    return {
      walletAddress: payload.walletAddress,
      countryCode: payload.countryCode.trim().toUpperCase(),
      allowTxHash: allowTx.hash,
      countryTxHash: countryTx.hash,
    };
  }

  private async ensureTreasuryAllowance(propertyAddress: string, minimumAmount: bigint) {
    const treasuryWallet = this.getTreasuryWallet();
    const backendWallet = this.getBackendWallet();
    const treasuryTokenContract = new Contract(
      propertyAddress,
      PROPERTY_SHARES_ABI,
      treasuryWallet,
    );
    const currentAllowance = await treasuryTokenContract.allowance(
      treasuryWallet.address,
      backendWallet.address,
    );

    if (currentAllowance >= minimumAmount) {
      return null;
    }

    const approvalTx = await treasuryTokenContract.approve(
      backendWallet.address,
      MaxUint256,
    );
    await approvalTx.wait();

    return approvalTx.hash;
  }

  private async buildSignedMetadataPayload(property: PropertyWithKeyPoints) {
    const backendWallet = this.getBackendWallet();
    const treasuryWallet = this.getTreasuryWallet();
    const payload = {
      version: 1,
      propertyId: property.id,
      name: property.name,
      symbol: this.buildPropertySymbol(property.name, property.id),
      localization: property.localization,
      livingArea: property.livingArea,
      score: property.score,
      description: property.description,
      roomNumber: property.roomNumber,
      bathroomNumber: property.bathroomNumber,
      tokenNumber: property.tokenNumber,
      tokenPrice: property.tokenPrice,
      tokenDecimals: property.tokenDecimals ?? 18,
      images: property.images,
      keyPoints: property.keyPoints.map((keyPoint) => keyPoint.label),
      createdAt: property.createdAt.toISOString(),
      treasuryWalletAddress: treasuryWallet.address,
      backendOperatorWalletAddress: backendWallet.address,
    };
    const rawPayload = JSON.stringify(payload);
    const hash = keccak256(Buffer.from(rawPayload, 'utf8'));
    const signature = await backendWallet.signMessage(getBytes(hash));
    const metadataUri = `${this.getMetadataBaseUrl()}/crypto/properties/${property.id}/metadata`;

    return {
      metadataUri,
      payload,
      integrity: {
        hash,
        signature,
      },
    };
  }

  private async getStoredOrFreshMetadataPayload(property: PropertyWithKeyPoints) {
    const deployOperation = await this.prisma.blockchainOperation.findFirst({
      where: {
        propertyId: property.id,
        type: BlockchainOperationType.DEPLOY_PROPERTY,
        status: BlockchainOperationStatus.CONFIRMED,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (deployOperation?.payload && typeof deployOperation.payload === 'object') {
      const stored = deployOperation.payload as {
        payload: Record<string, unknown>;
        metadataUri: string;
        integrity: {
          hash: string;
          signature: string;
        };
      };

      return stored;
    }

    return this.buildSignedMetadataPayload(property);
  }

  private async getPropertyForBlockchain(propertyId: number) {
    const property = await this.prisma.property.findUnique({
      where: {
        id: propertyId,
      },
      include: {
        keyPoints: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Bien introuvable.');
    }

    return property;
  }

  private buildPropertySymbol(name: string, propertyId: number) {
    const words = name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const acronym = words.map((word) => word.charAt(0)).join('').slice(0, 6);
    const compact = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const fallback = `NEO${propertyId}`.slice(0, 6);
    const symbol = acronym || compact || fallback;

    return symbol.length >= 3 ? symbol : `${symbol}${propertyId}`.slice(0, 6);
  }

  private countryCodeToBytes2(countryCode: string) {
    const normalized = countryCode.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(normalized)) {
      throw new BadRequestException('Le code pays doit être un code ISO alpha-2.');
    }

    return `0x${Buffer.from(normalized, 'utf8').toString('hex')}`;
  }

  private getMetadataBaseUrl() {
    return (
      this.configService.get<string>('BLOCKCHAIN_METADATA_BASE_URL')?.trim() ||
      `http://localhost:${this.configService.get<string>('PORT') ?? '3001'}`
    );
  }

  private ensureBlockchainEnabled() {
    if (!this.isBlockchainEnabled()) {
      throw new ServiceUnavailableException('Blockchain disabled.');
    }
  }

  private isBlockchainEnabled() {
    const rawValue = this.configService.get<string>('BLOCKCHAIN_ENABLED');
    return rawValue ? rawValue.trim().toLowerCase() !== 'false' : false;
  }

  private getRpcUrl() {
    const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL')?.trim();

    if (!rpcUrl) {
      throw new ServiceUnavailableException('BLOCKCHAIN_RPC_URL is missing.');
    }

    return rpcUrl;
  }

  private getProvider() {
    if (!this.provider) {
      const chainId = Number(this.configService.get<string>('BLOCKCHAIN_CHAIN_ID') ?? '31337');
      this.provider = new JsonRpcProvider(this.getRpcUrl(), chainId);
    }

    return this.provider;
  }

  private getBackendWallet() {
    if (!this.backendWallet) {
      this.backendWallet = this.createWalletFromConfig(
        'BLOCKCHAIN_BACKEND_PRIVATE_KEY',
        'BLOCKCHAIN_BACKEND_ACCOUNT_INDEX',
        0,
      );
    }

    return this.backendWallet;
  }

  private getTreasuryWallet() {
    if (!this.treasuryWallet) {
      this.treasuryWallet = this.createWalletFromConfig(
        'BLOCKCHAIN_TREASURY_PRIVATE_KEY',
        'BLOCKCHAIN_TREASURY_ACCOUNT_INDEX',
        1,
      );
    }

    return this.treasuryWallet;
  }

  private createWalletFromConfig(
    privateKeyName: string,
    accountIndexName: string,
    fallbackIndex: number,
  ) {
    const explicitPrivateKey = this.configService.get<string>(privateKeyName)?.trim();

    if (explicitPrivateKey) {
      return new Wallet(explicitPrivateKey, this.getProvider());
    }

    const mnemonic = this.configService.get<string>('BLOCKCHAIN_MNEMONIC')?.trim();

    if (!mnemonic) {
      throw new ServiceUnavailableException(
        `${privateKeyName} or BLOCKCHAIN_MNEMONIC must be configured.`,
      );
    }

    const accountIndex = Number(
      this.configService.get<string>(accountIndexName) ?? String(fallbackIndex),
    );
    const derivationPath = `m/44'/60'/0'/0/${accountIndex}`;

    return HDNodeWallet.fromPhrase(mnemonic, undefined, derivationPath).connect(
      this.getProvider(),
    );
  }

  private getDefaultCountryCode() {
    return (
      this.configService.get<string>('BLOCKCHAIN_DEFAULT_COUNTRY_CODE')?.trim() ||
      'FR'
    );
  }

  private getDeploymentsFilePath() {
    return (
      this.configService.get<string>('BLOCKCHAIN_DEPLOYMENTS_FILE')?.trim() ||
      resolve(process.cwd(), '..', 'crypto', 'deployments', 'local.json')
    );
  }

  private async getDeploymentManifest() {
    try {
      const file = await fs.readFile(this.getDeploymentsFilePath(), 'utf8');
      return JSON.parse(file) as DeploymentManifest;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  private async resolveContractAddresses() {
    const manifest = await this.getDeploymentManifest();
    const chainId = Number(
      this.configService.get<string>('BLOCKCHAIN_CHAIN_ID') ??
        String(manifest?.chainId ?? 31337),
    );
    const kycRegistry =
      this.configService.get<string>('BLOCKCHAIN_KYC_ADDRESS')?.trim() ??
      manifest?.contracts.kycRegistry;
    const transferGate =
      this.configService.get<string>('BLOCKCHAIN_GATE_ADDRESS')?.trim() ??
      manifest?.contracts.transferGate;
    const propertyFactory =
      this.configService.get<string>('BLOCKCHAIN_FACTORY_ADDRESS')?.trim() ??
      manifest?.contracts.propertyFactory;

    if (!kycRegistry || !transferGate || !propertyFactory) {
      throw new ServiceUnavailableException('Contract addresses are not configured.');
    }

    if (!isAddress(kycRegistry) || !isAddress(transferGate) || !isAddress(propertyFactory)) {
      throw new ServiceUnavailableException('One or more contract addresses are invalid.');
    }

    return {
      chainId,
      kycRegistry,
      transferGate,
      propertyFactory,
    };
  }
}
