import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Prisma, User, WalletStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto, PublicUser, UpdateUserDto } from './dto/user.dtos';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  toPublicUser(user: User): PublicUser {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  async getAllUsers(): Promise<PublicUser[]> {
    try {
      const users = await this.prisma.user.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users.map((user) => this.toPublicUser(user));
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'No user in database',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async getUserEntityById(id: number): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          id,
        },
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'User not found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async getUserById(id: number): Promise<PublicUser | null> {
    const user = await this.getUserEntityById(id);
    return user ? this.toPublicUser(user) : null;
  }

  async getUserEntityByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          email,
        },
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'User not found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  async getUserByEmail(email: string): Promise<PublicUser | null> {
    const user = await this.getUserEntityByEmail(email);
    return user ? this.toPublicUser(user) : null;
  }

  async createUser(data: CreateUserDto): Promise<PublicUser> {
    try {
      const profileFields = this.extractProfileFields(data);

      const createdUser = await this.prisma.user.create({
        data: {
          ...profileFields,
          email: data.email,
          password: await bcrypt.hash(data.password, 10),
          role: data.role ?? 'CLIENT',
          walletStatus: profileFields.walletAddress
            ? WalletStatus.PENDING
            : WalletStatus.UNSET,
        },
      });

      return this.toPublicUser(createdUser);
    } catch (error) {
      this.throwUserWriteError(error, 'Could not create user');
    }
  }

  async updateUser(id: number, data: UpdateUserDto): Promise<PublicUser> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: {
          id,
        },
        data: await this.buildUpdatePayload(data),
      });

      return this.toPublicUser(updatedUser);
    } catch (error) {
      this.throwUserWriteError(error, 'Could not update user');
    }
  }

  async deleteUser(id: number): Promise<PublicUser> {
    try {
      const deletedUser = await this.prisma.user.delete({
        where: {
          id,
        },
      });

      return this.toPublicUser(deletedUser);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'User not found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  private extractProfileFields(data: CreateUserDto | UpdateUserDto) {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
      day: data.day,
      month: data.month,
      year: data.year,
      birthPlace: data.birthPlace,
      nationality: data.nationality,
      number: data.number,
      occupation: data.occupation,
      taxResidence: data.taxResidence,
      annualIncomeRange: data.annualIncomeRange,
      investmentObjective: data.investmentObjective,
      countryCode: data.countryCode?.trim().toUpperCase(),
      walletAddress: data.walletAddress?.trim(),
    };
  }

  private async buildUpdatePayload(data: UpdateUserDto): Promise<Prisma.UserUpdateInput> {
    const payload: Prisma.UserUpdateInput = {
      ...this.extractProfileFields(data),
    };

    if (data.email !== undefined) {
      payload.email = data.email;
    }

    if (data.role !== undefined) {
      payload.role = data.role;
    }

    if (data.password && data.password.trim() !== '') {
      payload.password = await bcrypt.hash(data.password, 10);
    }

    if (data.countryCode !== undefined) {
      payload.countryCode = data.countryCode.trim().toUpperCase();
    }

    if (data.walletAddress !== undefined) {
      const normalizedWalletAddress = data.walletAddress.trim();
      payload.walletAddress = normalizedWalletAddress;
      payload.walletStatus =
        normalizedWalletAddress === '' ? WalletStatus.UNSET : WalletStatus.PENDING;
      payload.walletVerifiedAt = null;

      if (normalizedWalletAddress === '') {
        payload.walletAddress = null;
        payload.kycSyncedAt = null;
      }
    }

    return payload;
  }

  private throwUserWriteError(error: unknown, fallbackMessage: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const targets = Array.isArray(error.meta?.target)
        ? error.meta.target
        : [error.meta?.target].filter((value): value is string => typeof value === 'string');

      if (targets.includes('walletAddress')) {
        throw new BadRequestException('Wallet address already in use');
      }

      throw new BadRequestException('Email already in use');
    }

    throw new HttpException(
      {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: fallbackMessage,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        cause: error,
      },
    );
  }
}
