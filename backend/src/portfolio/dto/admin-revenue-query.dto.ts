import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PortfolioRevenueStatus } from '@prisma/client';

export class AdminRevenueQueryDto {
  @ApiPropertyOptional({
    description:
      'Restrict results to a given month (any ISO date within that month, UTC).',
    example: '2026-07-01',
  })
  @IsDateString()
  @IsOptional()
  month?: string;

  @ApiPropertyOptional({
    description: 'Restrict results to a given tokenized property.',
    example: 4,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  propertyId?: number;

  @ApiPropertyOptional({
    description: 'Restrict results to a given revenue status.',
    enum: PortfolioRevenueStatus,
  })
  @IsEnum(PortfolioRevenueStatus)
  @IsOptional()
  status?: PortfolioRevenueStatus;
}
