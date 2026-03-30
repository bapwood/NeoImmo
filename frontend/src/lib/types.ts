export type UserRole = 'ADMIN' | 'CLIENT';
export type WalletStatus = 'UNSET' | 'PENDING' | 'VERIFIED';
export type TokenizationStatus =
  | 'DRAFT'
  | 'DEPLOYED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'ARCHIVED';
export type BlockchainOperationType =
  | 'SYNC_WALLET_KYC'
  | 'SET_BLOCKLIST'
  | 'SET_BLOCKED_COUNTRY'
  | 'DEPLOY_PROPERTY'
  | 'MINT_PROPERTY'
  | 'PREPARE_PRIMARY_BUY'
  | 'EXECUTE_PRIMARY_BUY';
export type BlockchainOperationStatus =
  | 'PREPARED'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED';
export type PortfolioRevenueStatus = 'PROJECTED' | 'PAID';

export type UserRecord = {
  id: number;
  email: string;
  role: UserRole;
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  day?: string | null;
  month?: string | null;
  year?: string | null;
  birthPlace?: string | null;
  nationality?: string | null;
  number?: string | null;
  occupation?: string | null;
  taxResidence?: string | null;
  annualIncomeRange?: string | null;
  investmentObjective?: string | null;
  countryCode?: string | null;
  walletAddress?: string | null;
  walletStatus?: WalletStatus | null;
  walletVerifiedAt?: string | null;
  kycSyncedAt?: string | null;
  isRestricted?: boolean;
  restrictedAt?: string | null;
};

export type PropertyRecord = {
  id: number;
  name: string;
  createdAt: string;
  ownerId?: number | null;
  localization: string;
  livingArea: string;
  score: number;
  description: string;
  roomNumber: number;
  bathroomNumber: number;
  tokenNumber: number;
  tokenPrice: number;
  symbol?: string | null;
  contractAddress?: string | null;
  chainId?: number | null;
  metadataUri?: string | null;
  metadataHash?: string | null;
  metadataSignature?: string | null;
  deployTxHash?: string | null;
  tokenizationStatus?: TokenizationStatus | null;
  treasuryWalletAddress?: string | null;
  backendOperatorWalletAddress?: string | null;
  tokenDecimals?: number | null;
  images: string[];
  keyPoints: string[];
};

export type RefreshTokenRecord = {
  token: string;
  userId: number;
  expiryDate: string;
};

export type PanelUser = UserRecord;

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: PanelUser;
};

export type BlockchainPropertyReference = {
  id: number;
  name: string;
  contractAddress?: string | null;
  tokenizationStatus?: TokenizationStatus | null;
};

export type BlockchainUserReference = {
  id: number;
  email: string;
  walletAddress?: string | null;
  walletStatus?: WalletStatus | null;
};

export type BlockchainOperationRecord = {
  id: number;
  requestId?: string | null;
  type: BlockchainOperationType;
  status: BlockchainOperationStatus;
  chainId?: number | null;
  fromWallet?: string | null;
  toWallet?: string | null;
  amount?: string | null;
  price?: string | null;
  currency?: string | null;
  nonce?: string | null;
  deadline?: string | null;
  signature?: string | null;
  txHash?: string | null;
  payload?: Record<string, unknown> | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  property?: BlockchainPropertyReference | null;
  user?: BlockchainUserReference | null;
};

export type BlockchainOperationListResponse = {
  count: number;
  items: BlockchainOperationRecord[];
};

export type PropertyFactoryInfo = {
  token: string;
  gate: string;
  admin: string;
  name: string;
  symbol: string;
  metadataUri: string;
  metadataHash: string;
  createdAt: string;
};

export type PropertyDeploymentFundingSnapshot = {
  backendWalletAddress: string;
  backendBalanceWei: string;
  estimatedGasUnits?: string | null;
  gasPriceWei?: string | null;
  recommendedFundingWei?: string | null;
  shortfallWei?: string | null;
  ready: boolean;
  error?: string | null;
};

export type PropertyOnChainSnapshot = {
  available: boolean;
  deployed: boolean;
  totalSupply?: string | null;
  treasuryBalance?: string | null;
  backendAllowance?: string | null;
  factoryInfo?: PropertyFactoryInfo | null;
  funding?: PropertyDeploymentFundingSnapshot | null;
  error?: string | null;
};

export type PropertyTokenRecord = {
  id: number;
  name: string;
  tokenizationStatus: TokenizationStatus;
  symbol?: string | null;
  contractAddress?: string | null;
  chainId?: number | null;
  metadataUri?: string | null;
  metadataHash?: string | null;
  metadataSignature?: string | null;
  deployTxHash?: string | null;
  tokenNumber: number;
  tokenPrice: number;
  tokenDecimals: number;
  treasuryWalletAddress?: string | null;
  backendOperatorWalletAddress?: string | null;
};

export type PropertyTokenState = {
  property: PropertyTokenRecord;
  onChain: PropertyOnChainSnapshot;
  latestOperations: BlockchainOperationRecord[];
};

export type PreparedMarketplaceDomain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

export type PreparedMarketplaceTypes = {
  MarketplaceAction: Array<{
    name: string;
    type: string;
  }>;
};

export type PreparedMarketplaceMessage = {
  action: string;
  wallet: string;
  to: string;
  propertyAddress: string;
  amount: string;
  price: string;
  currency: string;
  nonce: string;
  deadline: string;
};

export type PreparePrimaryBuyResponse = {
  requestId: string;
  domain: PreparedMarketplaceDomain;
  types: PreparedMarketplaceTypes;
  message: PreparedMarketplaceMessage;
};

export type ExecutePrimaryBuyResponse = {
  requestId: string;
  txHash: string;
  approvalTxHash?: string | null;
};

export type PreparedAdminPropertyDeployTypes = {
  AdminPropertyAction: Array<{
    name: string;
    type: string;
  }>;
};

export type PreparedAdminPropertyDeployMessage = {
  action: 'DEPLOY_PROPERTY';
  adminWallet: string;
  propertyId: string;
  propertyName: string;
  symbol: string;
  metadataHash: string;
  nonce: string;
  deadline: string;
};

export type PreparePropertyDeployResponse = {
  requestId: string;
  domain: PreparedMarketplaceDomain;
  types: PreparedAdminPropertyDeployTypes;
  message: PreparedAdminPropertyDeployMessage;
};

export type ExecutePropertyDeployResponse = {
  requestId: string;
  txHash: string;
};

export type PortfolioRevenueBucket = {
  month: string;
  label: string;
  paid: number;
  projected: number;
  total: number;
};

export type PortfolioNextRevenue = {
  month: string;
  label: string;
  amount: number;
  status: PortfolioRevenueStatus;
};

export type PortfolioPropertyRecord = {
  id: number;
  name: string;
  localization: string;
  livingArea: string;
  roomNumber: number;
  bathroomNumber: number;
  score: number;
  description: string;
  tokenNumber: number;
  tokenPrice: number;
  contractAddress?: string | null;
  treasuryWalletAddress?: string | null;
  backendOperatorWalletAddress?: string | null;
  tokenizationStatus: TokenizationStatus;
  images: string[];
  keyPoints: string[];
};

export type PurchaseHistoryRecord = {
  id: number;
  requestId?: string | null;
  txHash: string;
  amount: string;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  fromWallet?: string | null;
  toWallet?: string | null;
  purchasedAt: string;
  property: PortfolioPropertyRecord;
};

export type PortfolioPositionRecord = {
  id: number;
  tokenAmount: string;
  averageTokenPrice: number;
  investedTotal: number;
  currentValuation: number;
  projectedMonthlyIncome: number;
  projectedAnnualYieldPercent: number;
  lastPurchaseAt?: string | null;
  property: PortfolioPropertyRecord;
  nextRevenue?: PortfolioNextRevenue | null;
};

export type ClientPortfolioSummary = {
  positionsCount: number;
  totalTokensHeld: string;
  totalInvested: number;
  currentValuation: number;
  projectedMonthlyIncome: number;
  projectedAnnualIncome: number;
  projectedAnnualYieldPercent: number;
  diversificationCount: number;
};

export type ClientPortfolio = {
  summary: ClientPortfolioSummary;
  positions: PortfolioPositionRecord[];
  revenueSeries: PortfolioRevenueBucket[];
  recentPurchases: PurchaseHistoryRecord[];
};

export type TableRow = Record<string, unknown>;
export type PanelRecord = UserRecord | PropertyRecord | RefreshTokenRecord;
