import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetUserRestrictionDto {
  @ApiProperty({
    description: 'Whether the user account must be restricted',
    example: true,
  })
  @IsBoolean()
  restricted: boolean;
}
