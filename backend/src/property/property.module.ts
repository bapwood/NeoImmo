import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [PropertyController],
  providers: [PropertyService, JwtAuthGuard, RolesGuard],
})
export class PropertyModule {}
