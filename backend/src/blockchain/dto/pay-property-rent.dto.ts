import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class PayPropertyRentDto {
  @ApiProperty({
    description: 'Month to distribute (any ISO date within that month, UTC).',
    example: '2026-07-01',
  })
  @IsDateString()
  month: string;
}
