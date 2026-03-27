import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
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
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'The last name of the user',
    example: 'Gates',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'The address of the user',
    example: '135 Avenue Foch',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'The city of the user',
    example: 'Paris',
    required: false,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    description: 'The postal code of the user',
    example: '75004',
    required: false,
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({
    description: 'The country of the user',
    example: 'France',
    required: false,
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: 'The day where the user is born',
    example: '09',
    required: false,
  })
  @IsString()
  @IsOptional()
  day?: string;

  @ApiProperty({
    description: 'The month where the user is born',
    example: '07',
    required: false,
  })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiProperty({
    description: 'The year where the user is born',
    example: '1996',
    required: false,
  })
  @IsString()
  @IsOptional()
  year?: string;

  @ApiProperty({
    description: 'The phone number of the user',
    example: '+33 6 12 34 56 78',
    required: false,
  })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiProperty({
    description: 'The place where the user is born',
    example: 'Lyon',
    required: false,
  })
  @IsString()
  @IsOptional()
  birthPlace?: string;

  @ApiProperty({
    description: 'The nationality of the user',
    example: 'Française',
    required: false,
  })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiProperty({
    description: 'The occupation of the user',
    example: 'Consultant',
    required: false,
  })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiProperty({
    description: 'The tax residence of the user',
    example: 'France',
    required: false,
  })
  @IsString()
  @IsOptional()
  taxResidence?: string;

  @ApiProperty({
    description: 'The annual income range of the user',
    example: '50k-100k',
    required: false,
  })
  @IsString()
  @IsOptional()
  annualIncomeRange?: string;

  @ApiProperty({
    description: 'The investment objective of the user',
    example: 'Préparer la retraite',
    required: false,
  })
  @IsString()
  @IsOptional()
  investmentObjective?: string;
}
