export type UserRole = 'ADMIN' | 'CLIENT';

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
  walletStatus?: 'UNSET' | 'PENDING' | 'VERIFIED' | null;
  walletVerifiedAt?: string | null;
  kycSyncedAt?: string | null;
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
  tokenizationStatus?: 'DRAFT' | 'DEPLOYED' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | null;
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

export type TableRow = Record<string, unknown>;
export type PanelRecord = UserRecord | PropertyRecord | RefreshTokenRecord;
