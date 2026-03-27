import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RefreshToken } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class RefreshTokenService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<RefreshToken[]> {
    try {
      return await this.prisma.refreshToken.findMany({
        orderBy: {
          expiryDate: 'desc',
        },
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'No refresh token in database',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async findOneByUserId(userId: number): Promise<RefreshToken | null> {
    try {
      return await this.prisma.refreshToken.findUnique({
        where: {
          userId,
        },
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Refresh token not found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async create(data: RefreshTokenDto): Promise<RefreshToken> {
    try {
      return await this.prisma.refreshToken.create({
        data: {
          ...data,
          expiryDate: new Date(data.expiryDate),
        },
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Could not create refresh token',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }
  }

  async update(userId: number, data: RefreshTokenDto): Promise<RefreshToken> {
    try {
      return await this.prisma.refreshToken.update({
        where: {
          userId,
        },
        data: {
          token: data.token,
          expiryDate: new Date(data.expiryDate),
        },
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Could not update refresh token',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
          cause: error,
        },
      );
    }
  }

  async remove(userId: number): Promise<RefreshToken> {
    try {
      return await this.prisma.refreshToken.delete({
        where: {
          userId,
        },
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Refresh token not found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }
}
