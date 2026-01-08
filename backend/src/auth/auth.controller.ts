import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Request, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { User } from '@prisma/client';
import { RegisterDto } from './dtos/register.dtos';
import { SignInDto } from './dtos/signin.dtos';
import { RefreshTokenDto } from './dtos/refresh-token.dtos';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiResponse({ status: 200, description: 'Login ok' })
  @ApiResponse({ status: 400, description: 'Missing/Wrong credentials' })
  @ApiResponse({ status: 401, description: 'Wrong credentials' })
  login(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Post('register')
  @ApiResponse({ status: 201, description: 'Register ok' })
  @ApiResponse({ status: 400, description: 'Missing/Already in use credentials' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @ApiResponse({ status: 201, description: 'Token refreshed' })
  @ApiResponse({ status: 400, description: 'Missing refresh token' })
  @ApiResponse({ status: 401, description: 'Wrong refresh token' })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.token);
  }
}
