import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class PreparePrimaryBuyDto {
  @ApiProperty({
    description: 'Property identifier',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiProperty({
    description: 'User identifier that owns the target wallet',
    example: 3,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    description: 'Amount of tokens to buy, expressed in human units before decimals',
    example: '3',
  })
  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  amount: string;

  @ApiProperty({
    description: 'Quoted price for the operation',
    example: '1250',
  })
  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  price: string;

  @ApiPropertyOptional({
    description: 'Quoted currency',
    example: 'EUR',
    default: 'EUR',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Signature validity window in minutes',
    example: 30,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  deadlineMinutes?: number;
}
