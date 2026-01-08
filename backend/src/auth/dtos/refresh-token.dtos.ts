import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The refresh token',
    example: '44af109c-5318-46d2-b062-9034b2dabed1',
  })
  @IsString()
  token: string;
}
