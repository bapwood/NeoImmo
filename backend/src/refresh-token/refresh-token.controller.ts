import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshTokenService } from './refresh-token.service';

@ApiTags('refresh-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('refresh-token')
export class RefreshTokenController {
  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'All refresh tokens have been fetched' })
  @ApiResponse({ status: 404, description: 'No refresh token in the database' })
  findAll() {
    return this.refreshTokenService.findAll();
  }

  @Get('user/:userId')
  @ApiResponse({ status: 200, description: 'The refresh token has been fetched' })
  @ApiResponse({ status: 404, description: 'Refresh token not found' })
  findOneByUserId(@Param('userId') userId: string) {
    return this.refreshTokenService.findOneByUserId(Number(userId));
  }

  @Post()
  @ApiResponse({ status: 201, description: 'The refresh token has been created' })
  @ApiResponse({ status: 400, description: 'Wrong data input' })
  @ApiResponse({ status: 500, description: 'Could not create the refresh token' })
  create(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.refreshTokenService.create(refreshTokenDto);
  }

  @Put(':userId')
  @ApiResponse({ status: 200, description: 'The refresh token has been updated' })
  @ApiResponse({ status: 400, description: 'Wrong data input' })
  @ApiResponse({ status: 500, description: 'Could not update the refresh token' })
  update(
    @Param('userId') userId: string,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    return this.refreshTokenService.update(Number(userId), refreshTokenDto);
  }

  @Delete(':userId')
  @ApiResponse({ status: 200, description: 'The refresh token has been deleted' })
  @ApiResponse({ status: 404, description: 'Refresh token not found' })
  remove(@Param('userId') userId: string) {
    return this.refreshTokenService.remove(Number(userId));
  }
}
