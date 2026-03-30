import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PortfolioRevenueStatus, TokenizationStatus } from '@prisma/client';

export class PortfolioPropertyDto {
  @ApiProperty({
    example: 12,
  })
  id: number;

  @ApiProperty({
    example: 'Residence Lafayette',
  })
  name: string;

  @ApiProperty({
    example: 'Lyon 6e',
  })
  localization: string;

  @ApiProperty({
    example: '84 m2',
  })
  livingArea: string;

  @ApiProperty({
    example: 4,
  })
  roomNumber: number;

  @ApiProperty({
    example: 2,
  })
  bathroomNumber: number;

  @ApiProperty({
    example: 87,
  })
  score: number;

  @ApiProperty({
    example: 'Actif résidentiel prime tokenisé.',
  })
  description: string;

  @ApiProperty({
    example: 1000,
  })
  tokenNumber: number;

  @ApiProperty({
    example: 1250,
  })
  tokenPrice: number;

  @ApiPropertyOptional({
    example: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    nullable: true,
  })
  contractAddress?: string | null;

  @ApiPropertyOptional({
    example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    nullable: true,
  })
  treasuryWalletAddress?: string | null;

  @ApiPropertyOptional({
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    nullable: true,
  })
  backendOperatorWalletAddress?: string | null;

  @ApiProperty({
    enum: TokenizationStatus,
    example: TokenizationStatus.ACTIVE,
  })
  tokenizationStatus: TokenizationStatus;

  @ApiProperty({
    type: [String],
    example: ['/uploads/properties/residence-lafayette-01.webp'],
  })
  images: string[];

  @ApiProperty({
    type: [String],
    example: ['Zone premium', 'Rendement cible'],
  })
  keyPoints: string[];
}

export class PortfolioRevenueBucketDto {
  @ApiProperty({
    example: '2026-04-01T00:00:00.000Z',
  })
  month: string;

  @ApiProperty({
    example: 'avr. 2026',
  })
  label: string;

  @ApiProperty({
    example: 120,
  })
  paid: number;

  @ApiProperty({
    example: 180,
  })
  projected: number;

  @ApiProperty({
    example: 300,
  })
  total: number;
}

export class PortfolioNextRevenueDto {
  @ApiProperty({
    example: '2026-04-01T00:00:00.000Z',
  })
  month: string;

  @ApiProperty({
    example: 'avr. 2026',
  })
  label: string;

  @ApiProperty({
    example: 26,
  })
  amount: number;

  @ApiProperty({
    enum: PortfolioRevenueStatus,
    example: PortfolioRevenueStatus.PROJECTED,
  })
  status: PortfolioRevenueStatus;
}

export class PortfolioPositionDto {
  @ApiProperty({
    example: 5,
  })
  id: number;

  @ApiProperty({
    example: '3',
  })
  tokenAmount: string;

  @ApiProperty({
    example: 1250,
  })
  averageTokenPrice: number;

  @ApiProperty({
    example: 3750,
  })
  investedTotal: number;

  @ApiProperty({
    example: 3750,
  })
  currentValuation: number;

  @ApiProperty({
    example: 17,
  })
  projectedMonthlyIncome: number;

  @ApiProperty({
    example: 5.44,
  })
  projectedAnnualYieldPercent: number;

  @ApiPropertyOptional({
    example: '2026-03-30T18:00:00.000Z',
    nullable: true,
  })
  lastPurchaseAt?: string | null;

  @ApiProperty({
    type: () => PortfolioPropertyDto,
  })
  property: PortfolioPropertyDto;

  @ApiPropertyOptional({
    type: () => PortfolioNextRevenueDto,
    nullable: true,
  })
  nextRevenue?: PortfolioNextRevenueDto | null;
}

export class PortfolioSummaryDto {
  @ApiProperty({
    example: 2,
  })
  positionsCount: number;

  @ApiProperty({
    example: '6',
  })
  totalTokensHeld: string;

  @ApiProperty({
    example: 7500,
  })
  totalInvested: number;

  @ApiProperty({
    example: 7500,
  })
  currentValuation: number;

  @ApiProperty({
    example: 34,
  })
  projectedMonthlyIncome: number;

  @ApiProperty({
    example: 408,
  })
  projectedAnnualIncome: number;

  @ApiProperty({
    example: 5.44,
  })
  projectedAnnualYieldPercent: number;

  @ApiProperty({
    example: 2,
  })
  diversificationCount: number;
}

export class PurchaseHistoryItemDto {
  @ApiProperty({
    example: 42,
  })
  id: number;

  @ApiPropertyOptional({
    example: 'b5b9b67e-5e0a-48d1-905f-571b913f60e3',
    nullable: true,
  })
  requestId?: string | null;

  @ApiProperty({
    example: '0x2556a306b9edee6111d68bf30f78200e07dc9cd53035f1f561d3e21429921268',
  })
  txHash: string;

  @ApiProperty({
    example: '2',
  })
  amount: string;

  @ApiProperty({
    example: 250,
  })
  unitPrice: number;

  @ApiProperty({
    example: 500,
  })
  totalPrice: number;

  @ApiProperty({
    example: 'EUR',
  })
  currency: string;

  @ApiPropertyOptional({
    example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    nullable: true,
  })
  fromWallet?: string | null;

  @ApiPropertyOptional({
    example: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    nullable: true,
  })
  toWallet?: string | null;

  @ApiProperty({
    example: '2026-03-30T19:10:00.000Z',
  })
  purchasedAt: string;

  @ApiProperty({
    type: () => PortfolioPropertyDto,
  })
  property: PortfolioPropertyDto;
}

export class ClientPortfolioResponseDto {
  @ApiProperty({
    type: () => PortfolioSummaryDto,
  })
  summary: PortfolioSummaryDto;

  @ApiProperty({
    type: [PortfolioPositionDto],
  })
  positions: PortfolioPositionDto[];

  @ApiProperty({
    type: [PortfolioRevenueBucketDto],
  })
  revenueSeries: PortfolioRevenueBucketDto[];

  @ApiProperty({
    type: [PurchaseHistoryItemDto],
  })
  recentPurchases: PurchaseHistoryItemDto[];
}
