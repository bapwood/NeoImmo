import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ExecutePropertyDeployDto {
  @ApiProperty({
    description: 'Prepared deploy request identifier',
    example: '4e9ca0f9-9d0f-44b2-82a5-8a2a8b9e7d5b',
  })
  @IsString()
  requestId: string;

  @ApiProperty({
    description: 'EIP-712 signature produced by the connected admin wallet',
    example: '0xabc123',
  })
  @IsString()
  signature: string;
}
