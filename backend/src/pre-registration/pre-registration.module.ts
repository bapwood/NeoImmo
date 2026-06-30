import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PreRegistrationController } from './pre-registration.controller';
import { PreRegistrationService } from './pre-registration.service';

@Module({
  imports: [PrismaModule],
  controllers: [PreRegistrationController],
  providers: [PreRegistrationService],
})
export class PreRegistrationModule {}