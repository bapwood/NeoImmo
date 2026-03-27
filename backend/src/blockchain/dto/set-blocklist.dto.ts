import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, Matches } from 'class-validator';

export class SetBlocklistDto {
  @ApiProperty({
    description: 'Wallet address to block or unblock',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  walletAddress: string;

  @ApiProperty({
    description: 'Whether the wallet should be blocked',
    example: true,
  })
  @IsBoolean()
  blocked: boolean;
}
