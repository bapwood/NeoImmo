import {
  BlockchainOperationStatus,
  BlockchainOperationType,
  TokenizationStatus,
  WalletStatus,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ADMIN_PROPERTY_DEPLOY_TYPES,
  MARKETPLACE_TYPES,
} from '../blockchain.constants';

export class BlockchainProviderDto {
  @ApiProperty({
    example: 'http://chain:8545',
  })
  rpcUrl: string;

  @ApiProperty({
    example: 31337,
  })
  chainId: number;
}

export class BlockchainWalletAddressesDto {
  @ApiProperty({
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  backendOperator: string;

  @ApiProperty({
    example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  })
  treasury: string;
}

export class BlockchainResolvedContractsDto {
  @ApiProperty({
    example: 31337,
  })
  chainId: number;

  @ApiProperty({
    example: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  })
  kycRegistry: string;

  @ApiProperty({
    example: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  })
  transferGate: string;

  @ApiProperty({
    example: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  })
  propertyFactory: string;
}

export class BlockchainManifestParticipantDto {
  @ApiProperty({
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  address: string;

  @ApiProperty({
    example: 0,
  })
  accountIndex: number;
}

export class BlockchainManifestContractsDto {
  @ApiProperty({
    type: String,
    example: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    nullable: true,
  })
  kycRegistry: string | null;

  @ApiProperty({
    type: String,
    example: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    nullable: true,
  })
  transferGate: string | null;

  @ApiProperty({
    type: String,
    example: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    nullable: true,
  })
  propertyFactory: string | null;
}

export class BlockchainManifestDto {
  @ApiProperty({
    example: 'localhost',
  })
  network: string;

  @ApiProperty({
    example: 31337,
  })
  chainId: number;

  @ApiProperty({
    example: '2026-03-27T22:39:32.116Z',
  })
  deployedAt: string;

  @ApiProperty({
    type: () => BlockchainManifestParticipantDto,
  })
  backendOperator: BlockchainManifestParticipantDto;

  @ApiProperty({
    type: () => BlockchainManifestParticipantDto,
  })
  treasury: BlockchainManifestParticipantDto;

  @ApiProperty({
    type: () => BlockchainManifestContractsDto,
  })
  contracts: BlockchainManifestContractsDto;
}

export class BlockchainHealthResponseDto {
  @ApiProperty({
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    example: true,
  })
  ready: boolean;

  @ApiProperty({
    example: '/usr/src/crypto/deployments/local.json',
  })
  deploymentsPath: string;

  @ApiPropertyOptional({
    type: () => BlockchainProviderDto,
  })
  provider?: BlockchainProviderDto;

  @ApiPropertyOptional({
    type: () => BlockchainWalletAddressesDto,
  })
  wallets?: BlockchainWalletAddressesDto;

  @ApiPropertyOptional({
    type: () => BlockchainResolvedContractsDto,
  })
  contracts?: BlockchainResolvedContractsDto;

  @ApiPropertyOptional({
    type: () => BlockchainManifestDto,
    nullable: true,
  })
  manifest?: BlockchainManifestDto | null;

  @ApiPropertyOptional({
    example: 'Contract addresses are not configured.',
  })
  error?: string;
}

export class PropertyMetadataPayloadDto {
  @ApiProperty({
    example: 1,
  })
  version: number;

  @ApiProperty({
    example: 12,
  })
  propertyId: number;

  @ApiProperty({
    example: 'Residence Lafayette',
  })
  name: string;

  @ApiProperty({
    example: 'RLAF12',
  })
  symbol: string;

  @ApiProperty({
    example: 'Lyon 6e',
  })
  localization: string;

  @ApiProperty({
    example: '84',
  })
  livingArea: string;

  @ApiProperty({
    example: 87,
  })
  score: number;

  @ApiProperty({
    example: 'Immeuble résidentiel premium tokenisé pour la vente primaire.',
  })
  description: string;

  @ApiProperty({
    example: 4,
  })
  roomNumber: number;

  @ApiProperty({
    example: 2,
  })
  bathroomNumber: number;

  @ApiProperty({
    example: 1000,
  })
  tokenNumber: number;

  @ApiProperty({
    example: 1250,
  })
  tokenPrice: number;

  @ApiProperty({
    example: 18,
  })
  tokenDecimals: number;

  @ApiProperty({
    type: [String],
    example: ['/uploads/properties/residence-lafayette-01.webp'],
  })
  images: string[];

  @ApiProperty({
    type: [String],
    example: ['Zone premium', 'Rendement stabilise'],
  })
  keyPoints: string[];

  @ApiProperty({
    example: '2026-03-27T22:41:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  })
  treasuryWalletAddress: string;

  @ApiProperty({
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  backendOperatorWalletAddress: string;
}

export class PropertyMetadataIntegrityDto {
  @ApiProperty({
    example: '0x8ed7549c07a6b1c16bd7d8faab6e6dd54f6c4fbc0897e67e0f6205f925e773ca',
  })
  hash: string;

  @ApiProperty({
    example: '0x6f3b1a9d4d5e7c...',
  })
  signature: string;

  @ApiProperty({
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  signer: string;
}

export class PropertyMetadataResponseDto {
  @ApiProperty({
    example: 'http://localhost:3001/crypto/properties/12/metadata',
  })
  metadataUri: string;

  @ApiProperty({
    type: () => PropertyMetadataPayloadDto,
  })
  payload: PropertyMetadataPayloadDto;

  @ApiProperty({
    type: () => PropertyMetadataIntegrityDto,
  })
  integrity: PropertyMetadataIntegrityDto;
}

export class WalletKycResultDto {
  @ApiPropertyOptional({
    example: '4e9ca0f9-9d0f-44b2-82a5-8a2a8b9e7d5b',
  })
  requestId?: string;

  @ApiProperty({
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  walletAddress: string;

  @ApiProperty({
    example: 'FR',
  })
  countryCode: string;

  @ApiProperty({
    example: '0x8e1cccb3906f5241c132d2cbbe1af4f8d9ef90f8666fb5db5298125a3d338a9f',
  })
  allowTxHash: string;

  @ApiProperty({
    example: '0xd050f7c36166d2083bf5d6eef19fe7757faeb1c92d25a5482246592bfab8c0f5',
  })
  countryTxHash: string;
}

export class SystemWalletBootstrapResponseDto {
  @ApiProperty({
    type: () => WalletKycResultDto,
  })
  backendOperator: WalletKycResultDto;

  @ApiProperty({
    type: () => WalletKycResultDto,
  })
  treasury: WalletKycResultDto;
}

export class TransactionResultDto {
  @ApiProperty({
    example: '4e9ca0f9-9d0f-44b2-82a5-8a2a8b9e7d5b',
  })
  requestId: string;

  @ApiProperty({
    example: '0x17a567b01df6b62cf0a2aa8d4e5e4eeab4d45c0af2211b78f6e08ce8aa7af3d3',
  })
  txHash: string;
}

export class MintPropertyInventoryResponseDto extends TransactionResultDto {
  @ApiPropertyOptional({
    type: String,
    example: '0x4a6644b1ea2bb1c50c7a2fe4a03e3cc92d9279cc1f36f278eb7ec48b1cd6fa12',
    nullable: true,
  })
  approvalTxHash?: string | null;

  @ApiProperty({
    example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  })
  toWallet: string;

  @ApiProperty({
    example: '1000',
  })
  amount: string;
}

export class ExecutePrimaryBuyResponseDto extends TransactionResultDto {
  @ApiPropertyOptional({
    type: String,
    example: '0x4a6644b1ea2bb1c50c7a2fe4a03e3cc92d9279cc1f36f278eb7ec48b1cd6fa12',
    nullable: true,
  })
  approvalTxHash?: string | null;
}

export class TypedDataDomainDto {
  @ApiProperty({
    example: 'RealEstateMarketplace',
  })
  name: string;

  @ApiProperty({
    example: '1',
  })
  version: string;

  @ApiProperty({
    example: 31337,
  })
  chainId: number;

  @ApiProperty({
    example: '0x6D5b301a5B6d8d1dEF10a7dB4fD3346b45037D9a',
  })
  verifyingContract: string;
}

export class PreparedMarketplaceMessageDto {
  @ApiProperty({
    example: 'BUY',
  })
  action: string;

  @ApiProperty({
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  wallet: string;

  @ApiProperty({
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  to: string;

  @ApiProperty({
    example: '0x6D5b301a5B6d8d1dEF10a7dB4fD3346b45037D9a',
  })
  propertyAddress: string;

  @ApiProperty({
    example: '3',
  })
  amount: string;

  @ApiProperty({
    example: '1250',
  })
  price: string;

  @ApiProperty({
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    example: '1711600000',
  })
  nonce: string;

  @ApiProperty({
    example: '1711601800',
  })
  deadline: string;
}

export class PreparePrimaryBuyResponseDto {
  @ApiProperty({
    example: '4e9ca0f9-9d0f-44b2-82a5-8a2a8b9e7d5b',
  })
  requestId: string;

  @ApiProperty({
    type: () => TypedDataDomainDto,
  })
  domain: TypedDataDomainDto;

  @ApiProperty({
    type: Object,
    example: MARKETPLACE_TYPES,
  })
  types: typeof MARKETPLACE_TYPES;

  @ApiProperty({
    type: () => PreparedMarketplaceMessageDto,
  })
  message: PreparedMarketplaceMessageDto;
}

export class PreparedAdminPropertyDeployMessageDto {
  @ApiProperty({
    example: 'DEPLOY_PROPERTY',
  })
  action: string;

  @ApiProperty({
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  adminWallet: string;

  @ApiProperty({
    example: '12',
  })
  propertyId: string;

  @ApiProperty({
    example: 'Residence Lafayette',
  })
  propertyName: string;

  @ApiProperty({
    example: 'RLAF12',
  })
  symbol: string;

  @ApiProperty({
    example: '0x8ed7549c07a6b1c16bd7d8faab6e6dd54f6c4fbc0897e67e0f6205f925e773ca',
  })
  metadataHash: string;

  @ApiProperty({
    example: '1711600000',
  })
  nonce: string;

  @ApiProperty({
    example: '1711601800',
  })
  deadline: string;
}

export class PreparePropertyDeployResponseDto {
  @ApiProperty({
    example: '4e9ca0f9-9d0f-44b2-82a5-8a2a8b9e7d5b',
  })
  requestId: string;

  @ApiProperty({
    type: () => TypedDataDomainDto,
  })
  domain: TypedDataDomainDto;

  @ApiProperty({
    type: Object,
    example: ADMIN_PROPERTY_DEPLOY_TYPES,
  })
  types: typeof ADMIN_PROPERTY_DEPLOY_TYPES;

  @ApiProperty({
    type: () => PreparedAdminPropertyDeployMessageDto,
  })
  message: PreparedAdminPropertyDeployMessageDto;
}

export class BlockchainPropertyReferenceDto {
  @ApiProperty({
    example: 12,
  })
  id: number;

  @ApiProperty({
    example: 'Residence Lafayette',
  })
  name: string;

  @ApiPropertyOptional({
    type: String,
    example: '0x6D5b301a5B6d8d1dEF10a7dB4fD3346b45037D9a',
    nullable: true,
  })
  contractAddress?: string | null;

  @ApiPropertyOptional({
    enum: TokenizationStatus,
    nullable: true,
  })
  tokenizationStatus?: TokenizationStatus | null;
}

export class BlockchainUserReferenceDto {
  @ApiProperty({
    example: 7,
  })
  id: number;

  @ApiProperty({
    example: 'client@neoimmo.test',
  })
  email: string;

  @ApiPropertyOptional({
    type: String,
    example: '0x1234567890abcdef1234567890abcdef12345678',
    nullable: true,
  })
  walletAddress?: string | null;

  @ApiPropertyOptional({
    enum: WalletStatus,
    nullable: true,
  })
  walletStatus?: WalletStatus | null;
}

export class BlockchainOperationDto {
  @ApiProperty({
    example: 41,
  })
  id: number;

  @ApiPropertyOptional({
    type: String,
    example: '4e9ca0f9-9d0f-44b2-82a5-8a2a8b9e7d5b',
    nullable: true,
  })
  requestId?: string | null;

  @ApiProperty({
    enum: BlockchainOperationType,
  })
  type: BlockchainOperationType;

  @ApiProperty({
    enum: BlockchainOperationStatus,
  })
  status: BlockchainOperationStatus;

  @ApiPropertyOptional({
    type: Number,
    example: 31337,
    nullable: true,
  })
  chainId?: number | null;

  @ApiPropertyOptional({
    type: String,
    example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    nullable: true,
  })
  fromWallet?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '0x1234567890abcdef1234567890abcdef12345678',
    nullable: true,
  })
  toWallet?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '3',
    nullable: true,
  })
  amount?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '1250',
    nullable: true,
  })
  price?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'EUR',
    nullable: true,
  })
  currency?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '1711600000',
    nullable: true,
  })
  nonce?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '2026-03-30T10:42:08.333Z',
    nullable: true,
  })
  deadline?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '0xabc123',
    nullable: true,
  })
  signature?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '0x17a567b01df6b62cf0a2aa8d4e5e4eeab4d45c0af2211b78f6e08ce8aa7af3d3',
    nullable: true,
  })
  txHash?: string | null;

  @ApiPropertyOptional({
    type: Object,
    example: { blocked: true },
    nullable: true,
  })
  payload?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Signature EIP-712 invalide.',
    nullable: true,
  })
  errorMessage?: string | null;

  @ApiProperty({
    example: '2026-03-30T10:41:44.111Z',
  })
  createdAt: string;

  @ApiProperty({
    example: '2026-03-30T10:42:08.333Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    type: () => BlockchainPropertyReferenceDto,
    nullable: true,
  })
  property?: BlockchainPropertyReferenceDto | null;

  @ApiPropertyOptional({
    type: () => BlockchainUserReferenceDto,
    nullable: true,
  })
  user?: BlockchainUserReferenceDto | null;
}

export class BlockchainOperationListResponseDto {
  @ApiProperty({
    example: 2,
  })
  count: number;

  @ApiProperty({
    type: [BlockchainOperationDto],
  })
  items: BlockchainOperationDto[];
}

export class PropertyTokenRecordDto {
  @ApiProperty({
    example: 12,
  })
  id: number;

  @ApiProperty({
    example: 'Residence Lafayette',
  })
  name: string;

  @ApiProperty({
    enum: TokenizationStatus,
  })
  tokenizationStatus: TokenizationStatus;

  @ApiPropertyOptional({
    type: String,
    example: 'RLAF12',
    nullable: true,
  })
  symbol?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '0x6D5b301a5B6d8d1dEF10a7dB4fD3346b45037D9a',
    nullable: true,
  })
  contractAddress?: string | null;

  @ApiPropertyOptional({
    type: Number,
    example: 31337,
    nullable: true,
  })
  chainId?: number | null;

  @ApiPropertyOptional({
    type: String,
    example: 'http://localhost:3001/crypto/properties/12/metadata',
    nullable: true,
  })
  metadataUri?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '0x8ed7549c07a6b1c16bd7d8faab6e6dd54f6c4fbc0897e67e0f6205f925e773ca',
    nullable: true,
  })
  metadataHash?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '0x6f3b1a9d4d5e7c...',
    nullable: true,
  })
  metadataSignature?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '0x17a567b01df6b62cf0a2aa8d4e5e4eeab4d45c0af2211b78f6e08ce8aa7af3d3',
    nullable: true,
  })
  deployTxHash?: string | null;

  @ApiProperty({
    example: 1000,
  })
  tokenNumber: number;

  @ApiProperty({
    example: 1250,
  })
  tokenPrice: number;

  @ApiProperty({
    example: 18,
  })
  tokenDecimals: number;

  @ApiPropertyOptional({
    type: String,
    example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    nullable: true,
  })
  treasuryWalletAddress?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    nullable: true,
  })
  backendOperatorWalletAddress?: string | null;
}

export class PropertyFactoryInfoDto {
  @ApiProperty({
    example: '0x6D5b301a5B6d8d1dEF10a7dB4fD3346b45037D9a',
  })
  token: string;

  @ApiProperty({
    example: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  })
  gate: string;

  @ApiProperty({
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  admin: string;

  @ApiProperty({
    example: 'Residence Lafayette',
  })
  name: string;

  @ApiProperty({
    example: 'RLAF12',
  })
  symbol: string;

  @ApiProperty({
    example: 'http://localhost:3001/crypto/properties/12/metadata',
  })
  metadataUri: string;

  @ApiProperty({
    example: '0x8ed7549c07a6b1c16bd7d8faab6e6dd54f6c4fbc0897e67e0f6205f925e773ca',
  })
  metadataHash: string;

  @ApiProperty({
    example: '1711600000',
  })
  createdAt: string;
}

export class PropertyDeploymentFundingSnapshotDto {
  @ApiProperty({
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  backendWalletAddress: string;

  @ApiProperty({
    example: '5800000000000000',
  })
  backendBalanceWei: string;

  @ApiPropertyOptional({
    type: String,
    example: '2548011',
    nullable: true,
  })
  estimatedGasUnits?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '2000000000',
    nullable: true,
  })
  gasPriceWei?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '6115226400000000',
    nullable: true,
  })
  recommendedFundingWei?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '315226400000000',
    nullable: true,
  })
  shortfallWei?: string | null;

  @ApiProperty({
    example: false,
  })
  ready: boolean;

  @ApiPropertyOptional({
    type: String,
    example: 'Gas estimation unavailable.',
    nullable: true,
  })
  error?: string | null;
}

export class PropertyOnChainSnapshotDto {
  @ApiProperty({
    example: true,
  })
  available: boolean;

  @ApiProperty({
    example: true,
  })
  deployed: boolean;

  @ApiPropertyOptional({
    type: String,
    example: '1000',
    nullable: true,
  })
  totalSupply?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '997',
    nullable: true,
  })
  treasuryBalance?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    nullable: true,
  })
  backendAllowance?: string | null;

  @ApiPropertyOptional({
    type: () => PropertyFactoryInfoDto,
    nullable: true,
  })
  factoryInfo?: PropertyFactoryInfoDto | null;

  @ApiPropertyOptional({
    type: () => PropertyDeploymentFundingSnapshotDto,
    nullable: true,
  })
  funding?: PropertyDeploymentFundingSnapshotDto | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Blockchain disabled.',
    nullable: true,
  })
  error?: string | null;
}

export class PropertyTokenStateResponseDto {
  @ApiProperty({
    type: () => PropertyTokenRecordDto,
  })
  property: PropertyTokenRecordDto;

  @ApiProperty({
    type: () => PropertyOnChainSnapshotDto,
  })
  onChain: PropertyOnChainSnapshotDto;

  @ApiProperty({
    type: [BlockchainOperationDto],
  })
  latestOperations: BlockchainOperationDto[];
}

export class UserComplianceRecordDto {
  @ApiProperty({
    example: 7,
  })
  id: number;

  @ApiProperty({
    example: 'client@neoimmo.test',
  })
  email: string;

  @ApiPropertyOptional({
    type: String,
    example: '0x1234567890abcdef1234567890abcdef12345678',
    nullable: true,
  })
  walletAddress?: string | null;

  @ApiProperty({
    enum: WalletStatus,
  })
  walletStatus: WalletStatus;

  @ApiPropertyOptional({
    type: String,
    example: '2026-03-30T10:40:00.000Z',
    nullable: true,
  })
  walletVerifiedAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '2026-03-30T10:40:02.000Z',
    nullable: true,
  })
  kycSyncedAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'FR',
    nullable: true,
  })
  countryCode?: string | null;
}

export class WalletOnChainSnapshotDto {
  @ApiProperty({
    example: true,
  })
  available: boolean;

  @ApiProperty({
    example: true,
  })
  walletRegistered: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    nullable: true,
  })
  allowed?: boolean | null;

  @ApiPropertyOptional({
    type: String,
    example: 'FR',
    nullable: true,
  })
  onChainCountryCode?: string | null;

  @ApiPropertyOptional({
    type: Boolean,
    example: false,
    nullable: true,
  })
  walletBlocklisted?: boolean | null;

  @ApiPropertyOptional({
    type: Boolean,
    example: false,
    nullable: true,
  })
  countryBlocked?: boolean | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Blockchain disabled.',
    nullable: true,
  })
  error?: string | null;
}

export class UserComplianceStateResponseDto {
  @ApiProperty({
    type: () => UserComplianceRecordDto,
  })
  user: UserComplianceRecordDto;

  @ApiProperty({
    type: () => WalletOnChainSnapshotDto,
  })
  onChain: WalletOnChainSnapshotDto;

  @ApiProperty({
    type: [BlockchainOperationDto],
  })
  latestOperations: BlockchainOperationDto[];
}
