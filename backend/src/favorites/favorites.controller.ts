import { Controller, Get, Post, Delete, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  getFavorites(@Request() req) {
     const userId = req.user.userId; 
    return this.favoritesService.getFavorites(userId);
  }

  @Post(':propertyId')
  addFavorite(@Request() req, @Param('propertyId', ParseIntPipe) propertyId: number) {
    const userId = req.user.userId;
    return this.favoritesService.addFavorite(userId, propertyId);
  }

  @Delete(':propertyId')
  removeFavorite(@Request() req, @Param('propertyId', ParseIntPipe) propertyId: number) {
    const userId = req.user.userId;
    return this.favoritesService.removeFavorite(userId, propertyId);
  }
}
