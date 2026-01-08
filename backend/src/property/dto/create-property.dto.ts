import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Max, Min } from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty({
    description: 'The name of the property',
    example: 'Paris Appartment 1',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The localization of the property',
    example: 'Paris 13e Arrondissement',
  })
  @IsString()
  localization: string;

  @ApiProperty({
    description: 'The surface of the property',
    example: '20m2',
  })
  @IsString()
  livingArea: string;

  @ApiProperty({
    description: 'The score of the property',
    minimum: 1,
    maximum: 5,
    example: '4',
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  score: number;
}
