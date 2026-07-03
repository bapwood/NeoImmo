import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async getFavorites(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: true,
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user.favorites;
  }

  async addFavorite(userId: number, propertyId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        favorites: {
          connect: { id: propertyId },
        },
      },
      include: { favorites: true },
    });
  }

  async removeFavorite(userId: number, propertyId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        favorites: {
          disconnect: { id: propertyId },
        },
      },
      include: { favorites: true },
    });
  }
}
