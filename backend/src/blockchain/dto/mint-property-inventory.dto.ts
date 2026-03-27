import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class MintPropertyInventoryDto {
  @ApiPropertyOptional({
    description: 'Token amount to mint, expressed in human units before decimals',
    example: '100000',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d+(\.\d+)?$/)
  amount?: string;
}
