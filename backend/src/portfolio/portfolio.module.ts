import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [PortfolioController],
  providers: [PortfolioService, JwtAuthGuard, RolesGuard],
  exports: [PortfolioService],
})
export class PortfolioModule {}
