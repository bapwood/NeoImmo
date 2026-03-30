import {
  BlockchainOperationStatus,
  BlockchainOperationType,
} from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class BlockchainOperationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by blockchain operation type',
    enum: BlockchainOperationType,
  })
  @IsEnum(BlockchainOperationType)
  @IsOptional()
  type?: BlockchainOperationType;

  @ApiPropertyOptional({
    description: 'Filter by blockchain operation status',
    enum: BlockchainOperationStatus,
  })
  @IsEnum(BlockchainOperationStatus)
  @IsOptional()
  status?: BlockchainOperationStatus;

  @ApiPropertyOptional({
    description: 'Filter by property identifier',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  propertyId?: number;

  @ApiPropertyOptional({
    description: 'Filter by user identifier',
    example: 7,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Limit the number of operations returned',
    example: 20,
    default: 20,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by prepared request identifier',
    example: '4e9ca0f9-9d0f-44b2-82a5-8a2a8b9e7d5b',
  })
  @IsString()
  @IsOptional()
  requestId?: string;
}
