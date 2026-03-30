import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PortfolioModule } from 'src/portfolio/portfolio.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';

@Module({
  imports: [PrismaModule, JwtModule, PortfolioModule],
  controllers: [BlockchainController],
  providers: [BlockchainService, JwtAuthGuard, RolesGuard],
  exports: [BlockchainService],
})
export class BlockchainModule {}
