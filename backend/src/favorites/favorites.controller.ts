import { Controller, Get, Post, Delete, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  getFavorites(@Request() req) {
    return this.favoritesService.getFavorites(req.user.id);
  }

  @Post(':propertyId')
  addFavorite(@Request() req, @Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.favoritesService.addFavorite(req.user.id, propertyId);
  }

  @Delete(':propertyId')
  removeFavorite(@Request() req, @Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.favoritesService.removeFavorite(req.user.id, propertyId);
  }
}