import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PreRegistrationService {
  constructor(private prisma: PrismaService) {}

  async preRegister(userId: number, propertyId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        preRegistrations: {
          connect: { id: propertyId },
        },
      },
    });
  }

  async cancelPreRegistration(userId: number, propertyId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        preRegistrations: {
          disconnect: { id: propertyId },
        },
      },
    });
  }

  async getMyPreRegistrations(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preRegistrations: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user.preRegistrations;
  }
}
