import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

class UserBaseDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'test@email.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'The first name of the user',
    example: 'Bill',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'The last name of the user',
    example: 'Gates',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'The address of the user',
    example: '135 Avenue Foch',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'The city of the user',
    example: 'Paris',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'The postal code of the user',
    example: '75004',
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'The country of the user',
    example: 'France',
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description: 'The day where the user is born',
    example: '09',
  })
  @IsString()
  @IsOptional()
  day?: string;

  @ApiPropertyOptional({
    description: 'The month where the user is born',
    example: '07',
  })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiPropertyOptional({
    description: 'The year where the user is born',
    example: '1996',
  })
  @IsString()
  @IsOptional()
  year?: string;

  @ApiPropertyOptional({
    description: 'The place where the user is born',
    example: 'Lyon',
  })
  @IsString()
  @IsOptional()
  birthPlace?: string;

  @ApiPropertyOptional({
    description: 'The nationality of the user',
    example: 'Française',
  })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({
    description: 'The phone number of the user',
    example: '+33 6 12 34 56 78',
  })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiPropertyOptional({
    description: 'The occupation of the user',
    example: 'Consultant',
  })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({
    description: 'The main tax residence of the user',
    example: 'France',
  })
  @IsString()
  @IsOptional()
  taxResidence?: string;

  @ApiPropertyOptional({
    description: 'The annual income range of the user',
    example: '50k-100k',
  })
  @IsString()
  @IsOptional()
  annualIncomeRange?: string;

  @ApiPropertyOptional({
    description: 'The investment objective of the user',
    example: 'Préparer la retraite',
  })
  @IsString()
  @IsOptional()
  investmentObjective?: string;
}

export class CreateUserDto extends UserBaseDto {
  @ApiProperty({
    description: 'The password of the user',
    example: '1234',
  })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'The role of the user',
    enum: Role,
    default: Role.CLIENT,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'The email of the user',
    example: 'test@email.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'The password of the user',
    example: '1234',
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'The role of the user',
    enum: Role,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    description: 'The first name of the user',
    example: 'Bill',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'The last name of the user',
    example: 'Gates',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'The address of the user',
    example: '135 Avenue Foch',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'The city of the user',
    example: 'Paris',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'The country of the user',
    example: 'France',
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description: 'The postal code of the user',
    example: '75004',
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'The day where the user is born',
    example: '09',
  })
  @IsString()
  @IsOptional()
  day?: string;

  @ApiPropertyOptional({
    description: 'The month where the user is born',
    example: '07',
  })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiPropertyOptional({
    description: 'The year where the user is born',
    example: '1996',
  })
  @IsString()
  @IsOptional()
  year?: string;

  @ApiPropertyOptional({
    description: 'The place where the user is born',
    example: 'Lyon',
  })
  @IsString()
  @IsOptional()
  birthPlace?: string;

  @ApiPropertyOptional({
    description: 'The nationality of the user',
    example: 'Française',
  })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({
    description: 'The phone number of the user',
    example: '+33 6 12 34 56 78',
  })
  @IsString()
  @IsOptional()
  number?: string;

  @ApiPropertyOptional({
    description: 'The occupation of the user',
    example: 'Consultant',
  })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({
    description: 'The main tax residence of the user',
    example: 'France',
  })
  @IsString()
  @IsOptional()
  taxResidence?: string;

  @ApiPropertyOptional({
    description: 'The annual income range of the user',
    example: '50k-100k',
  })
  @IsString()
  @IsOptional()
  annualIncomeRange?: string;

  @ApiPropertyOptional({
    description: 'The investment objective of the user',
    example: 'Préparer la retraite',
  })
  @IsString()
  @IsOptional()
  investmentObjective?: string;
}

export type PublicUser = Omit<User, 'password'>;
