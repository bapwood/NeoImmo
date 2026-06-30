import { Controller, Get, Post, Delete, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { PreRegistrationService } from './pre-registration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('pre-registrations')
export class PreRegistrationController {
  constructor(private readonly preRegistrationService: PreRegistrationService) {}

  @Get()
  getMyPreRegistrations(@Request() req) {
    const userId = req.user.userId; 
    return this.preRegistrationService.getMyPreRegistrations(userId);
  }

  @Post(':propertyId')
  preRegister(@Request() req, @Param('propertyId', ParseIntPipe) propertyId: number) {
    const userId = req.user.userId;
    return this.preRegistrationService.preRegister(userId, propertyId);
  }

  @Delete(':propertyId')
  cancelPreRegistration(@Request() req, @Param('propertyId', ParseIntPipe) propertyId: number) {
    const userId = req.user.userId;
    return this.preRegistrationService.cancelPreRegistration(userId, propertyId);
  }
}