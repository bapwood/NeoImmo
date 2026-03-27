import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RefreshTokenController } from './refresh-token.controller';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService, JwtAuthGuard, RolesGuard],
})
export class RefreshTokenModule {}
