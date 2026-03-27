import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The refresh token value',
    example: '4b1260a6-fdbd-4e4d-a430-2e8f5b7a6bf3',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'The related user identifier',
    example: 1,
  })
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'The refresh token expiration date',
    example: '2026-03-28T12:00:00.000Z',
  })
  @IsDateString()
  expiryDate: string;
}
