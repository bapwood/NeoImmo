import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEthereumAddress, IsInt, IsOptional, Min } from 'class-validator';

export class PreparePropertyDeployDto {
  @ApiProperty({
    description: 'Admin wallet address currently connected in the frontend',
    example: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  })
  @IsEthereumAddress()
  adminWalletAddress: string;

  @ApiPropertyOptional({
    description: 'Signature validity window in minutes',
    example: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  deadlineMinutes?: number;
}
