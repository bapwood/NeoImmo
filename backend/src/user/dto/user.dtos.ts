import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class UserDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'test@email.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    example: '1234',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'The first name of the user',
    example: 'Bill',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'The last name of the user',
    example: 'Gates',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'The address of the user',
    example: '135 Avenue Foch',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'The city of the user',
    example: 'Paris',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    description: 'The country of the user',
    example: 'France',
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: 'The day where the user is born',
    example: 'Bill',
  })
  @IsString()
  @IsOptional()
  day?: string;

  @ApiProperty({
    description: 'The month where the user is born',
    example: 'Bill',
  })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiProperty({
    description: 'The year where the user is born',
    example: 'Bill',
  })
  @IsString()
  @IsOptional()
  year?: string;

  @ApiProperty({
    description: 'The number of the user',
    example: 'Bill',
  })
  @IsString()
  @IsOptional()
  number?: string;
}
