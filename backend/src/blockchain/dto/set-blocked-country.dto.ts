import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, Matches } from 'class-validator';

export class SetBlockedCountryDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'US',
  })
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  countryCode: string;

  @ApiProperty({
    description: 'Whether the country should be blocked',
    example: true,
  })
  @IsBoolean()
  blocked: boolean;
}
