import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dtos/refresh-token.dtos';
import { RegisterDto } from './dtos/register.dto';
import { SignInDto } from './dtos/signin.dtos';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiResponse({ status: 200, description: 'Login ok' })
  @ApiResponse({ status: 400, description: 'Missing/Wrong credentials' })
  @ApiResponse({ status: 401, description: 'Wrong credentials' })
  @ApiResponse({ status: 403, description: 'Restricted account' })
  login(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Post('register')
  @ApiResponse({ status: 201, description: 'Register ok' })
  @ApiResponse({ status: 400, description: 'Missing/Already in use credentials' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('bootstrap-admin')
  @ApiResponse({ status: 201, description: 'Bootstrap admin created' })
  @ApiResponse({ status: 400, description: 'Admin already exists or invalid payload' })
  bootstrapAdmin(@Body() registerDto: RegisterDto) {
    return this.authService.bootstrapAdmin(registerDto);
  }

  @Post('refresh')
  @ApiResponse({ status: 201, description: 'Token refreshed' })
  @ApiResponse({ status: 400, description: 'Missing refresh token' })
  @ApiResponse({ status: 401, description: 'Wrong refresh token' })
  @ApiResponse({ status: 403, description: 'Restricted account' })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.token);
  }
}
