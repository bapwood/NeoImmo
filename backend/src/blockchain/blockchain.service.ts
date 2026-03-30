import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  NonceManager,
  parseUnits,
  verifyTypedData,
  Wallet,
} from 'ethers';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PortfolioService } from 'src/portfolio/portfolio.service';
import {
  ADMIN_PROPERTY_DEPLOY_TYPES,
  KYC_REGISTRY_ABI,
  MARKETPLACE_TYPES,
  PROPERTY_FACTORY_ABI,
  PROPERTY_SHARES_ABI,
  TRANSFER_GATE_ABI,
} from './blockchain.constants';
import { BlockchainOperationsQueryDto } from './dto/blockchain-query.dto';
import { ExecutePropertyDeployDto } from './dto/execute-property-deploy.dto';
import { ExecutePrimaryBuyDto } from './dto/execute-primary-buy.dto';
import { MintPropertyInventoryDto } from './dto/mint-property-inventory.dto';
import { PreparePropertyDeployDto } from './dto/prepare-property-deploy.dto';
import { PrepareClientPrimaryBuyDto } from './dto/prepare-client-primary-buy.dto';
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

type AdminPropertyDeployMessage = {
  action: 'DEPLOY_PROPERTY';
  adminWallet: string;
  propertyId: string;
  propertyName: string;
  symbol: string;
  metadataHash: string;
  nonce: string;
  deadline: string;
};

type PreparedAdminPropertyDeployPayload = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: typeof ADMIN_PROPERTY_DEPLOY_TYPES;
  message: AdminPropertyDeployMessage;
};

type PreparedPropertyDeployOperationPayload = {
  metadataUri: string;
  payload: Record<string, unknown>;
  integrity: {
    hash: string;
    signature: string;
  };
  typedData?: PreparedAdminPropertyDeployPayload;
  adminApproval?: {
    walletAddress: string;
    signature: string;
    signedAt: string;
  };
};

const blockchainOperationInclude = {
  property: {
    select: {
      id: true,
      name: true,
      contractAddress: true,
      tokenizationStatus: true,
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      walletAddress: true,
      walletStatus: true,
    },
  },
} satisfies Prisma.BlockchainOperationInclude;

type BlockchainOperationRecord = Prisma.BlockchainOperationGetPayload<{
  include: typeof blockchainOperationInclude;
}>;

@Injectable()
export class BlockchainService {
  private provider: JsonRpcProvider | null = null;
  private backendWallet: Wallet | HDNodeWallet | null = null;
  private treasuryWallet: Wallet | HDNodeWallet | null = null;
  private backendSigner: NonceManager | null = null;
  private treasurySigner: NonceManager | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly portfolioService: PortfolioService,
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

  async listOperations(query: BlockchainOperationsQueryDto) {
    const where = this.buildOperationWhereClause(query);
    const take = query.limit ?? 20;

    const [count, items] = await Promise.all([
      this.prisma.blockchainOperation.count({ where }),
      this.prisma.blockchainOperation.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take,
        include: blockchainOperationInclude,
      }),
    ]);

    return {
      count,
      items,
    };
  }

  async getOperationByRequestId(requestId: string) {
    const operation = await this.prisma.blockchainOperation.findUnique({
      where: {
        requestId,
      },
      include: blockchainOperationInclude,
    });

    if (!operation) {
      throw new NotFoundException('Operation blockchain introuvable.');
    }

    return operation;
  }

  async getPropertyTokenState(propertyId: number) {
    const property = await this.getPropertyForBlockchain(propertyId);
    const systemWallets = this.getSystemWalletAddressesSafe();
    const latestOperations = await this.prisma.blockchainOperation.findMany({
      where: {
        propertyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      include: blockchainOperationInclude,
    });

    const response = {
      property: {
        id: property.id,
        name: property.name,
        tokenizationStatus: property.tokenizationStatus,
        symbol: property.symbol,
        contractAddress: property.contractAddress,
        chainId: property.chainId,
        metadataUri: property.metadataUri,
        metadataHash: property.metadataHash,
        metadataSignature: property.metadataSignature,
        deployTxHash: property.deployTxHash,
        tokenNumber: property.tokenNumber,
        tokenPrice: property.tokenPrice,
        tokenDecimals: property.tokenDecimals,
        treasuryWalletAddress:
          property.treasuryWalletAddress ?? systemWallets.treasuryWalletAddress,
        backendOperatorWalletAddress:
          property.backendOperatorWalletAddress ?? systemWallets.backendOperatorWalletAddress,
      },
      onChain: {
        available: this.isBlockchainEnabled(),
        deployed: Boolean(property.contractAddress),
        totalSupply: null as string | null,
        treasuryBalance: null as string | null,
        backendAllowance: null as string | null,
        funding: null as
          | {
              backendWalletAddress: string;
              backendBalanceWei: string;
              estimatedGasUnits: string | null;
              gasPriceWei: string | null;
              recommendedFundingWei: string | null;
              shortfallWei: string | null;
              ready: boolean;
              error: string | null;
            }
          | null,
        factoryInfo: null as
          | {
              token: string;
              gate: string;
              admin: string;
              name: string;
              symbol: string;
              metadataUri: string;
              metadataHash: string;
              createdAt: string;
            }
          | null,
        error: null as string | null,
      },
      latestOperations,
    };

    if (this.isBlockchainEnabled()) {
      response.onChain.funding = await this.getPropertyDeploymentFundingSnapshot(property);
    }

    if (!property.contractAddress || !this.isBlockchainEnabled()) {
      return response;
    }

    try {
      const contracts = await this.resolveContractAddresses();
      const provider = this.getProvider();
      const tokenContract = new Contract(
        property.contractAddress,
        PROPERTY_SHARES_ABI,
        provider,
      );
      const propertyFactory = new Contract(
        contracts.propertyFactory,
        PROPERTY_FACTORY_ABI,
        provider,
      );
      const treasuryWalletAddress =
        property.treasuryWalletAddress ?? this.getTreasuryWallet().address;
      const backendOperatorWalletAddress =
        property.backendOperatorWalletAddress ?? this.getBackendWallet().address;

      const [totalSupply, treasuryBalance, backendAllowance, factoryInfoRaw] =
        await Promise.all([
          tokenContract.totalSupply(),
          tokenContract.balanceOf(treasuryWalletAddress),
          tokenContract.allowance(treasuryWalletAddress, backendOperatorWalletAddress),
          propertyFactory.propertyInfo(property.contractAddress),
        ]);

      response.onChain = {
        available: true,
        deployed: true,
        totalSupply: totalSupply.toString(),
        treasuryBalance: treasuryBalance.toString(),
        backendAllowance: backendAllowance.toString(),
        funding: response.onChain.funding,
        factoryInfo: this.normalizeFactoryInfo(factoryInfoRaw),
        error: null,
      };

      return response;
    } catch (error) {
      response.onChain = {
        ...response.onChain,
        available: false,
        error:
          error instanceof Error
            ? error.message
            : 'Lecture on-chain du bien impossible.',
      };

      return response;
    }
  }

  async getUserComplianceState(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        walletStatus: true,
        walletVerifiedAt: true,
        kycSyncedAt: true,
        countryCode: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const latestOperations = await this.prisma.blockchainOperation.findMany({
      where: user.walletAddress
        ? {
            OR: [
              {
                userId,
              },
              {
                toWallet: user.walletAddress,
              },
              {
                fromWallet: user.walletAddress,
              },
            ],
          }
        : {
            userId,
          },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      include: blockchainOperationInclude,
    });

    return {
      user,
      onChain: await this.getWalletComplianceSnapshot(
        user.walletAddress,
        user.countryCode,
      ),
      latestOperations,
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
        this.getBackendSigner(),
      );
      const tx = await this.sendWithNonceRetry(() =>
        transferGate.setBlocklist(payload.walletAddress, payload.blocked),
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
        this.getBackendSigner(),
      );
      const tx = await this.sendWithNonceRetry(() =>
        transferGate.setBlockedCountry(
          this.countryCodeToBytes2(payload.countryCode),
          payload.blocked,
        ),
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

  async preparePropertyTokenDeployment(
    propertyId: number,
    adminUserId: number,
    payload?: PreparePropertyDeployDto,
  ) {
    this.ensureBlockchainEnabled();

    const [property, adminUser, contracts] = await Promise.all([
      this.getPropertyForBlockchain(propertyId),
      this.prisma.user.findUnique({
        where: {
          id: adminUserId,
        },
        select: {
          id: true,
          email: true,
        },
      }),
      this.resolveContractAddresses(),
    ]);

    if (!adminUser) {
      throw new NotFoundException('Administrateur introuvable.');
    }

    if (property.contractAddress) {
      throw new BadRequestException('Ce bien possède déjà un contrat déployé.');
    }

    const adminWalletAddress = payload?.adminWalletAddress?.trim();

    if (!adminWalletAddress || !isAddress(adminWalletAddress)) {
      throw new BadRequestException(
        'La wallet administrateur connectée au frontend est manquante ou invalide.',
      );
    }

    const fundingSnapshot = await this.getPropertyDeploymentFundingSnapshot(property);

    if (!fundingSnapshot.ready) {
      throw new BadRequestException(
        fundingSnapshot.error
          ? `Le financement de la wallet backend est indisponible: ${fundingSnapshot.error}`
          : `La wallet backend doit être financée avant le déploiement. Manque ${fundingSnapshot.shortfallWei ?? '0'} wei.`,
      );
    }

    const metadata = await this.buildSignedMetadataPayload(property);
    const symbol = this.buildPropertySymbol(property.name, property.id);
    const requestId = randomUUID();
    const nonce = String(Date.now());
    const deadline =
      payload?.deadlineMinutes && payload.deadlineMinutes > 0
        ? String(Math.floor(Date.now() / 1000) + payload.deadlineMinutes * 60)
        : '0';
    const typedData: PreparedAdminPropertyDeployPayload = {
      domain: {
        name: 'NeoImmoAdmin',
        version: '1',
        chainId: contracts.chainId,
        verifyingContract: contracts.propertyFactory,
      },
      types: ADMIN_PROPERTY_DEPLOY_TYPES,
      message: {
        action: 'DEPLOY_PROPERTY',
        adminWallet: adminWalletAddress,
        propertyId: String(property.id),
        propertyName: property.name,
        symbol,
        metadataHash: metadata.integrity.hash,
        nonce,
        deadline,
      },
    };
    const preparedPayload: PreparedPropertyDeployOperationPayload = {
      ...metadata,
      typedData,
    };

    await this.prisma.blockchainOperation.create({
      data: {
        requestId,
        type: BlockchainOperationType.DEPLOY_PROPERTY,
        status: BlockchainOperationStatus.PREPARED,
        chainId: contracts.chainId,
        propertyId: property.id,
        userId: adminUser.id,
        fromWallet: adminWalletAddress,
        toWallet: contracts.propertyFactory,
        nonce,
        deadline: deadline === '0' ? null : new Date(Number(deadline) * 1000),
        payload: preparedPayload as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      requestId,
      ...typedData,
    };
  }

  async executePreparedPropertyTokenDeployment(
    propertyId: number,
    adminUserId: number,
    payload: ExecutePropertyDeployDto,
  ) {
    this.ensureBlockchainEnabled();

    const operation = await this.prisma.blockchainOperation.findUnique({
      where: {
        requestId: payload.requestId,
      },
      include: {
        property: {
          include: {
            keyPoints: true,
          },
        },
        user: true,
      },
    });

    if (!operation || !operation.property || !operation.user) {
      throw new NotFoundException('La demande de déploiement préparée est introuvable.');
    }

    if (operation.type !== BlockchainOperationType.DEPLOY_PROPERTY) {
      throw new BadRequestException('Cette demande préparée ne correspond pas à un déploiement.');
    }

    if (operation.property.id !== propertyId) {
      throw new BadRequestException('Cette demande préparée ne correspond pas à ce bien.');
    }

    if (operation.user.id !== adminUserId) {
      throw new ForbiddenException('Cette demande préparée n’appartient pas à cet administrateur.');
    }

    if (operation.status === BlockchainOperationStatus.CONFIRMED && operation.txHash) {
      throw new ConflictException('Cette demande a deja ete executee.');
    }

    if (operation.status === BlockchainOperationStatus.SUBMITTED) {
      throw new ConflictException('Cette demande est deja en cours d’execution.');
    }

    if (operation.property.contractAddress) {
      throw new BadRequestException('Ce bien possède déjà un contrat déployé.');
    }

    const fundingSnapshot = await this.getPropertyDeploymentFundingSnapshot(operation.property);

    if (!fundingSnapshot.ready) {
      throw new BadRequestException(
        fundingSnapshot.error
          ? `Le financement de la wallet backend est indisponible: ${fundingSnapshot.error}`
          : `La wallet backend doit être financée avant le déploiement. Manque ${fundingSnapshot.shortfallWei ?? '0'} wei.`,
      );
    }

    if (!operation.payload || typeof operation.payload !== 'object') {
      throw new BadRequestException('Le payload de déploiement préparé est invalide.');
    }

    const preparedPayload = operation.payload as unknown as PreparedPropertyDeployOperationPayload;

    if (
      !preparedPayload.typedData ||
      !preparedPayload.payload ||
      !preparedPayload.metadataUri ||
      !preparedPayload.integrity?.hash ||
      !preparedPayload.integrity?.signature
    ) {
      throw new BadRequestException('Le payload de déploiement préparé est incomplet.');
    }

    const recoveredWallet = verifyTypedData(
      preparedPayload.typedData.domain,
      preparedPayload.typedData.types,
      preparedPayload.typedData.message,
      payload.signature,
    );

    if (
      recoveredWallet.toLowerCase() !==
      preparedPayload.typedData.message.adminWallet.toLowerCase()
    ) {
      throw new BadRequestException('Signature EIP-712 administrateur invalide.');
    }

    if (
      operation.fromWallet &&
      preparedPayload.typedData.message.adminWallet.toLowerCase() !==
        operation.fromWallet.toLowerCase()
    ) {
      throw new BadRequestException(
        'La signature ne correspond pas à la wallet administrateur préparée.',
      );
    }

    if (preparedPayload.typedData.message.deadline !== '0') {
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (BigInt(preparedPayload.typedData.message.deadline) < now) {
        throw new BadRequestException('La signature de déploiement a expiré.');
      }
    }

    await this.prisma.blockchainOperation.update({
      where: {
        id: operation.id,
      },
      data: {
        status: BlockchainOperationStatus.SUBMITTED,
        signature: payload.signature,
      },
    });

    try {
      const deployResult = await this.deployPropertyTokenWithTracking({
        property: operation.property,
        symbol: preparedPayload.typedData.message.symbol,
        operationId: operation.id,
        operationPayload: {
          ...preparedPayload,
          adminApproval: {
            walletAddress: preparedPayload.typedData.message.adminWallet,
            signature: payload.signature,
            signedAt: new Date().toISOString(),
          },
        } satisfies PreparedPropertyDeployOperationPayload,
      });

      return {
        requestId: payload.requestId,
        txHash: deployResult.txHash,
      };
    } catch (error) {
      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.FAILED,
          signature: payload.signature,
          errorMessage: error instanceof Error ? error.message : 'Property deployment failed.',
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
    const metadata = await this.buildSignedMetadataPayload(property);
    const symbol = this.buildPropertySymbol(property.name, property.id);
    const requestId = randomUUID();

    const operation = await this.prisma.blockchainOperation.create({
      data: {
        requestId,
        type: BlockchainOperationType.DEPLOY_PROPERTY,
        status: BlockchainOperationStatus.SUBMITTED,
        chainId: contracts.chainId,
        propertyId: property.id,
        fromWallet: this.getBackendWallet().address,
        toWallet: contracts.propertyFactory,
        payload: metadata as unknown as Prisma.InputJsonValue,
      },
    });

    try {
      const deployResult = await this.deployPropertyTokenWithTracking({
        property,
        symbol,
        operationId: operation.id,
        operationPayload: metadata as unknown as Prisma.InputJsonValue,
      });

      return deployResult.property;
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
      this.getBackendSigner(),
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
      const tx = await this.sendWithNonceRetry(() =>
        tokenContract.mint(treasuryWallet.address, parsedAmount),
      );
      await tx.wait();

      const approvalTxHash = await this.ensureTreasuryAllowance(
        property.contractAddress,
        parsedAmount,
      );

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
            payload: {
              approvalTxHash,
            } satisfies Prisma.JsonObject,
          },
        }),
      ]);

      return {
        requestId,
        txHash: tx.hash,
        approvalTxHash,
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

  async setPropertyPurchaseAvailability(propertyId: number, available: boolean) {
    const property = await this.getPropertyForBlockchain(propertyId);

    if (!property.contractAddress) {
      throw new BadRequestException(
        'Le contrat doit être déployé avant de piloter la disponibilité achat.',
      );
    }

    if (available) {
      if (property.tokenizationStatus === TokenizationStatus.ACTIVE) {
        return this.serializePropertyTokenRecord(property);
      }

      if (property.tokenizationStatus === TokenizationStatus.PAUSED) {
        const updatedProperty = await this.prisma.property.update({
          where: {
            id: property.id,
          },
          data: {
            tokenizationStatus: TokenizationStatus.ACTIVE,
          },
        });

        return this.serializePropertyTokenRecord(updatedProperty);
      }

      if (property.tokenizationStatus === TokenizationStatus.DEPLOYED) {
        throw new BadRequestException(
          'Le mint doit être réalisé avant de remettre ce bien à l’achat client.',
        );
      }

      throw new BadRequestException(
        'Ce bien ne peut pas être remis à l’achat dans son état actuel.',
      );
    }

    if (property.tokenizationStatus === TokenizationStatus.PAUSED) {
      return this.serializePropertyTokenRecord(property);
    }

    if (property.tokenizationStatus !== TokenizationStatus.ACTIVE) {
      throw new BadRequestException(
        'Seuls les biens actifs peuvent être retirés de l’achat client.',
      );
    }

    const updatedProperty = await this.prisma.property.update({
      where: {
        id: property.id,
      },
      data: {
        tokenizationStatus: TokenizationStatus.PAUSED,
      },
    });

    return this.serializePropertyTokenRecord(updatedProperty);
  }

  async prepareClientPrimaryBuy(
    userId: number,
    payload: PrepareClientPrimaryBuyDto,
  ) {
    return this.preparePrimaryBuyForUser(userId, payload);
  }

  async preparePrimaryBuy(payload: PreparePrimaryBuyDto) {
    return this.preparePrimaryBuyForUser(payload.userId, payload);
  }

  private async preparePrimaryBuyForUser(
    userId: number,
    payload: Omit<PreparePrimaryBuyDto, 'userId'>,
  ) {
    this.ensureBlockchainEnabled();

    const property = await this.getPropertyForBlockchain(payload.propertyId);
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    if (!user.walletAddress) {
      throw new BadRequestException('La wallet du client est manquante.');
    }

    if (!user.countryCode) {
      throw new BadRequestException('Le code pays ISO du client est manquant.');
    }

    if (!property.contractAddress) {
      throw new BadRequestException('Le bien n’est pas encore déployé on-chain.');
    }

    if (property.tokenizationStatus !== TokenizationStatus.ACTIVE) {
      throw new BadRequestException(
        'Le bien doit etre actif on-chain avant de preparer un achat.',
      );
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
      throw new BadRequestException('Nombre de tokens insufisants.');
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

  async executeClientPrimaryBuy(userId: number, payload: ExecutePrimaryBuyDto) {
    return this.executePrimaryBuyForUser(payload, userId);
  }

  async executePrimaryBuy(payload: ExecutePrimaryBuyDto) {
    return this.executePrimaryBuyForUser(payload);
  }

  private async executePrimaryBuyForUser(
    payload: ExecutePrimaryBuyDto,
    expectedUserId?: number,
  ) {
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

    if (expectedUserId != null && operation.user.id !== expectedUserId) {
      throw new ForbiddenException('Cette demande préparée n’appartient pas à ce client.');
    }

    if (operation.status === BlockchainOperationStatus.CONFIRMED && operation.txHash) {
      throw new ConflictException('Cette demande a deja ete executee.');
    }

    if (operation.status === BlockchainOperationStatus.SUBMITTED) {
      throw new ConflictException('Cette demande est deja en cours d’execution.');
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
      this.getBackendSigner(),
    );
    const amount = parseUnits(
      prepared.message.amount,
      operation.property.tokenDecimals ?? 18,
    );

    const approvalTxHash = await this.ensureTreasuryAllowance(
      operation.property.contractAddress,
      amount,
    );

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
      const tx = await this.sendWithNonceRetry(() =>
        tokenContract.transferFrom(
          treasuryWallet.address,
          prepared.message.to,
          amount,
        ),
      );
      await tx.wait();

      await this.portfolioService.recordPrimaryPurchase({
        userId: operation.user.id,
        propertyId: operation.property.id,
        amount: prepared.message.amount,
        unitPrice: Number(prepared.message.price),
      });

      await this.prisma.blockchainOperation.update({
        where: {
          id: operation.id,
        },
        data: {
          status: BlockchainOperationStatus.CONFIRMED,
          txHash: tx.hash,
          signature: payload.signature,
          payload: {
            ...prepared,
            approvalTxHash,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        requestId: payload.requestId,
        txHash: tx.hash,
        approvalTxHash,
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
      this.getBackendSigner(),
    );
    const allowTx = await this.sendWithNonceRetry(() =>
      kycRegistry.setAllowed(
        payload.walletAddress,
        payload.allowed ?? true,
      ),
    );
    await allowTx.wait();

    const countryTx = await this.sendWithNonceRetry(() =>
      kycRegistry.setCountry(
        payload.walletAddress,
        this.countryCodeToBytes2(payload.countryCode),
      ),
    );
    await countryTx.wait();

    return {
      walletAddress: payload.walletAddress,
      countryCode: payload.countryCode.trim().toUpperCase(),
      allowTxHash: allowTx.hash,
      countryTxHash: countryTx.hash,
    };
  }

  private async getWalletComplianceSnapshot(
    walletAddress?: string | null,
    fallbackCountryCode?: string | null,
  ) {
    if (!walletAddress) {
      return {
        available: this.isBlockchainEnabled(),
        walletRegistered: false,
        allowed: null,
        onChainCountryCode: null,
        walletBlocklisted: null,
        countryBlocked: null,
        error: null,
      };
    }

    if (!this.isBlockchainEnabled()) {
      return {
        available: false,
        walletRegistered: true,
        allowed: null,
        onChainCountryCode: fallbackCountryCode ?? null,
        walletBlocklisted: null,
        countryBlocked: null,
        error: 'Blockchain disabled.',
      };
    }

    try {
      const contracts = await this.resolveContractAddresses();
      const provider = this.getProvider();
      const kycRegistry = new Contract(contracts.kycRegistry, KYC_REGISTRY_ABI, provider);
      const transferGate = new Contract(contracts.transferGate, TRANSFER_GATE_ABI, provider);

      const [allowed, rawCountryCode, walletBlocklisted] = await Promise.all([
        kycRegistry.isAllowed(walletAddress),
        kycRegistry.countryCode(walletAddress),
        transferGate.blocklist(walletAddress),
      ]);
      const onChainCountryCode =
        this.bytes2ToCountryCode(rawCountryCode) ?? fallbackCountryCode ?? null;
      const countryBlocked = onChainCountryCode
        ? await transferGate.blockedCountries(this.countryCodeToBytes2(onChainCountryCode))
        : null;

      return {
        available: true,
        walletRegistered: true,
        allowed,
        onChainCountryCode,
        walletBlocklisted,
        countryBlocked,
        error: null,
      };
    } catch (error) {
      return {
        available: false,
        walletRegistered: true,
        allowed: null,
        onChainCountryCode: fallbackCountryCode ?? null,
        walletBlocklisted: null,
        countryBlocked: null,
        error:
          error instanceof Error
            ? error.message
            : 'Lecture de conformite wallet impossible.',
      };
    }
  }

  private async ensureTreasuryAllowance(propertyAddress: string, minimumAmount: bigint) {
    const treasuryWallet = this.getTreasuryWallet();
    const backendWallet = this.getBackendWallet();
    const treasuryTokenContract = new Contract(
      propertyAddress,
      PROPERTY_SHARES_ABI,
      this.getTreasurySigner(),
    );
    const currentAllowance = await treasuryTokenContract.allowance(
      treasuryWallet.address,
      backendWallet.address,
    );

    if (currentAllowance >= minimumAmount) {
      return null;
    }

    const approvalTx = await this.sendWithNonceRetry(() =>
      treasuryTokenContract.approve(
        backendWallet.address,
        MaxUint256,
      ),
    );
    await approvalTx.wait();

    return approvalTx.hash;
  }

  private getSystemWalletAddressesSafe() {
    try {
      return {
        treasuryWalletAddress: this.getTreasuryWallet().address,
        backendOperatorWalletAddress: this.getBackendWallet().address,
      };
    } catch {
      return {
        treasuryWalletAddress: null,
        backendOperatorWalletAddress: null,
      };
    }
  }

  private async getPropertyDeploymentFundingSnapshot(property: PropertyWithKeyPoints) {
    const backendWalletAddress = this.getSystemWalletAddressesSafe().backendOperatorWalletAddress;

    if (!this.isBlockchainEnabled()) {
      return {
        backendWalletAddress: backendWalletAddress ?? '',
        backendBalanceWei: '0',
        estimatedGasUnits: null,
        gasPriceWei: null,
        recommendedFundingWei: null,
        shortfallWei: null,
        ready: false,
        error: 'Blockchain disabled.',
      };
    }

    try {
      const contracts = await this.resolveContractAddresses();
      const provider = this.getProvider();
      const backendWallet = this.getBackendWallet();
      const metadata = await this.buildSignedMetadataPayload(property);
      const symbol = this.buildPropertySymbol(property.name, property.id);
      const propertyFactory = new Contract(
        contracts.propertyFactory,
        PROPERTY_FACTORY_ABI,
        provider,
      );
      const createProperty = propertyFactory.getFunction('createProperty');
      let estimatedGasUnits: bigint;

      try {
        estimatedGasUnits = await createProperty.estimateGas(
          property.name,
          symbol,
          metadata.metadataUri,
          metadata.integrity.hash,
        );
      } catch {
        estimatedGasUnits = BigInt(3_500_000);
      }

      const feeData = await provider.getFeeData();
      const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? parseUnits('2', 'gwei');
      const backendBalance = await provider.getBalance(backendWallet.address);
      const recommendedFundingWei = (estimatedGasUnits * gasPrice * BigInt(120)) / BigInt(100);
      const shortfallWei =
        backendBalance >= recommendedFundingWei
          ? BigInt(0)
          : recommendedFundingWei - backendBalance;

      return {
        backendWalletAddress: backendWallet.address,
        backendBalanceWei: backendBalance.toString(),
        estimatedGasUnits: estimatedGasUnits.toString(),
        gasPriceWei: gasPrice.toString(),
        recommendedFundingWei: recommendedFundingWei.toString(),
        shortfallWei: shortfallWei.toString(),
        ready: shortfallWei === BigInt(0),
        error: null,
      };
    } catch (error) {
      return {
        backendWalletAddress: backendWalletAddress ?? '',
        backendBalanceWei: '0',
        estimatedGasUnits: null,
        gasPriceWei: null,
        recommendedFundingWei: null,
        shortfallWei: null,
        ready: false,
        error:
          error instanceof Error
            ? error.message
            : 'Estimation du financement de déploiement impossible.',
      };
    }
  }

  private async deployPropertyTokenWithTracking(params: {
    property: PropertyWithKeyPoints;
    symbol: string;
    operationId: number;
    operationPayload: unknown;
  }) {
    const contracts = await this.resolveContractAddresses();
    const backendWallet = this.getBackendWallet();
    const treasuryWallet = this.getTreasuryWallet();
    const propertyFactory = new Contract(
      contracts.propertyFactory,
      PROPERTY_FACTORY_ABI,
      this.getBackendSigner(),
    );
    const metadataPayload = params.operationPayload as PreparedPropertyDeployOperationPayload;
    const createProperty = propertyFactory.getFunction('createProperty');
    const tokenAddress = await createProperty.staticCall(
      params.property.name,
      params.symbol,
      metadataPayload.metadataUri,
      metadataPayload.integrity.hash,
    );
    const deployedTx = await this.sendWithNonceRetry(() =>
      createProperty(
        params.property.name,
        params.symbol,
        metadataPayload.metadataUri,
        metadataPayload.integrity.hash,
      ),
    );
    await deployedTx.wait();

    const updatedProperty = await this.prisma.property.update({
      where: {
        id: params.property.id,
      },
      data: {
        symbol: params.symbol,
        contractAddress: tokenAddress,
        chainId: contracts.chainId,
        metadataUri: metadataPayload.metadataUri,
        metadataHash: metadataPayload.integrity.hash,
        metadataSignature: metadataPayload.integrity.signature,
        deployTxHash: deployedTx.hash,
        tokenizationStatus: TokenizationStatus.DEPLOYED,
        treasuryWalletAddress: treasuryWallet.address,
        backendOperatorWalletAddress: backendWallet.address,
        tokenDecimals: 18,
      },
    });

    await this.prisma.blockchainOperation.update({
      where: {
        id: params.operationId,
      },
      data: {
        status: BlockchainOperationStatus.CONFIRMED,
        txHash: deployedTx.hash,
        toWallet: tokenAddress,
        chainId: contracts.chainId,
        payload: params.operationPayload as Prisma.InputJsonValue,
      },
    });

    return {
      property: updatedProperty,
      txHash: deployedTx.hash,
      tokenAddress,
    };
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

  private buildOperationWhereClause(query: BlockchainOperationsQueryDto) {
    const where: Prisma.BlockchainOperationWhereInput = {};

    if (query.requestId) {
      where.requestId = query.requestId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    return where;
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

  private serializePropertyTokenRecord(property: {
    id: number;
    name: string;
    tokenizationStatus: TokenizationStatus;
    symbol: string | null;
    contractAddress: string | null;
    chainId: number | null;
    metadataUri: string | null;
    metadataHash: string | null;
    metadataSignature: string | null;
    deployTxHash: string | null;
    tokenNumber: number;
    tokenPrice: number;
    tokenDecimals: number | null;
    treasuryWalletAddress: string | null;
    backendOperatorWalletAddress: string | null;
  }) {
    return {
      id: property.id,
      name: property.name,
      tokenizationStatus: property.tokenizationStatus,
      symbol: property.symbol,
      contractAddress: property.contractAddress,
      chainId: property.chainId,
      metadataUri: property.metadataUri,
      metadataHash: property.metadataHash,
      metadataSignature: property.metadataSignature,
      deployTxHash: property.deployTxHash,
      tokenNumber: property.tokenNumber,
      tokenPrice: property.tokenPrice,
      tokenDecimals: property.tokenDecimals ?? 18,
      treasuryWalletAddress: property.treasuryWalletAddress,
      backendOperatorWalletAddress: property.backendOperatorWalletAddress,
    };
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

  private normalizeFactoryInfo(value: unknown) {
    const info = value as {
      token?: string;
      gate?: string;
      admin?: string;
      name?: string;
      symbol?: string;
      metadataURI?: string;
      metadataHash?: string;
      createdAt?: bigint;
      0?: string;
      1?: string;
      2?: string;
      3?: string;
      4?: string;
      5?: string;
      6?: string;
      7?: bigint;
    };

    return {
      token: info.token ?? info[0] ?? '',
      gate: info.gate ?? info[1] ?? '',
      admin: info.admin ?? info[2] ?? '',
      name: info.name ?? info[3] ?? '',
      symbol: info.symbol ?? info[4] ?? '',
      metadataUri: info.metadataURI ?? info[5] ?? '',
      metadataHash: info.metadataHash ?? info[6] ?? '',
      createdAt: String(info.createdAt ?? info[7] ?? '0'),
    };
  }

  private countryCodeToBytes2(countryCode: string) {
    const normalized = countryCode.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(normalized)) {
      throw new BadRequestException('Le code pays doit être un code ISO alpha-2.');
    }

    return `0x${Buffer.from(normalized, 'utf8').toString('hex')}`;
  }

  private bytes2ToCountryCode(value: string) {
    if (!value || value === '0x0000') {
      return null;
    }

    const hexValue = value.startsWith('0x') ? value.slice(2) : value;

    try {
      const normalized = Buffer.from(hexValue, 'hex')
        .toString('utf8')
        .replace(/\u0000/g, '')
        .trim()
        .toUpperCase();

      return normalized === '' ? null : normalized;
    } catch {
      return null;
    }
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

  private getBackendSigner() {
    if (!this.backendSigner) {
      this.backendSigner = new NonceManager(this.getBackendWallet());
    }

    return this.backendSigner;
  }

  private getTreasurySigner() {
    if (!this.treasurySigner) {
      this.treasurySigner = new NonceManager(this.getTreasuryWallet());
    }

    return this.treasurySigner;
  }

  private async sendWithNonceRetry<T>(callback: () => Promise<T>) {
    try {
      return await callback();
    } catch (error) {
      if (!this.isNonceConflict(error)) {
        throw error;
      }

      this.resetManagedSigners();
      return callback();
    }
  }

  private isNonceConflict(error: unknown) {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as {
      code?: string;
      shortMessage?: string;
      message?: string;
      info?: {
        error?: {
          message?: string;
        };
      };
    };

    if (candidate.code === 'NONCE_EXPIRED') {
      return true;
    }

    const mergedMessage = [
      candidate.shortMessage,
      candidate.message,
      candidate.info?.error?.message,
    ]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();

    return (
      mergedMessage.includes('nonce too low') ||
      mergedMessage.includes('nonce too high') ||
      mergedMessage.includes('expected nonce') ||
      mergedMessage.includes('nonce has already been used')
    );
  }

  private resetManagedSigners() {
    this.backendSigner?.reset();
    this.treasurySigner?.reset();
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
