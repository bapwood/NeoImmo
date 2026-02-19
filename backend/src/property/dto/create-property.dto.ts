import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsArray, Max, Min } from 'class-validator';

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

  @ApiProperty({
    description: 'The surface of the property',
    example: '20m2',
  })
  @IsString()
  description:  string;

  @ApiProperty({
    description: 'The number of rooms',
    example: '3',
  })
  @IsNumber()
  roomNumber: number;

  @ApiProperty({
    description: 'The number of bathrooms',
    example: '2',
  })
  @IsNumber()
  bathroomNumber: number;

  @ApiProperty({
    description: 'The number of token',
    example: '100,000',
  })
  @IsNumber()
  tokenNumber: number;

  @ApiProperty({
    description: 'The price of the token',
    example: '1',
  })
  @IsNumber()
  tokenPrice: number;

  @ApiProperty({
    description: 'Images of the property',
    example: '[https://neoimmo.s3.amazonaws.com/neoimmo/property_1.jpg]',
  })
  @IsArray()
  images: string[];
}
