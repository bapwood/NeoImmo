import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class SyncWalletKycDto {
  @ApiProperty({
    description: 'Wallet address to synchronize on-chain',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  walletAddress: string;

  @ApiProperty({
    description: 'Whether the wallet is allowed by the KYC registry',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  allowed?: boolean;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'FR',
  })
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  countryCode: string;
}
