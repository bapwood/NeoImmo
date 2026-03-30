import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetPropertyPurchaseAvailabilityDto {
  @ApiProperty({
    description: 'Whether the tokenized property should remain open to client primary purchases',
    example: false,
  })
  @IsBoolean()
  available: boolean;
}
