import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class SignInDto {
  @ApiProperty({
    description: 'The email of the user already registered',
    example: 'test@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The password of the user already registered',
    example: '1234',
  })
  @IsString()
  password: string;
}
