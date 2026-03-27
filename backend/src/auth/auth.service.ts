import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/user/dto/user.dtos';
import { UserService } from 'src/user/user.service';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dtos/register.dto';
import { SignInDto } from './dtos/signin.dtos';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async signIn(signInDto: SignInDto) {
    const existingUser = await this.userService.getUserEntityByEmail(signInDto.email);

    if (!existingUser) {
      throw new UnauthorizedException('Wrong credentials');
    }

    const passwordMatch = await bcrypt.compare(
      signInDto.password,
      existingUser.password,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Wrong credentials');
    }

    const tokens = await this.generateUserTokens(
      existingUser.id,
      existingUser.email,
      existingUser.role,
    );

    return {
      ...tokens,
      user: this.userService.toPublicUser(existingUser),
    };
  }

  async register(registerDto: RegisterDto) {
    const emailInUse = await this.userService.getUserEntityByEmail(registerDto.email);

    if (emailInUse) {
      throw new BadRequestException('Email already in use');
    }

    const createdUser = await this.userService.createUser({
      ...registerDto,
      role: Role.CLIENT,
    } satisfies CreateUserDto);

    const tokens = await this.generateUserTokens(
      createdUser.id,
      createdUser.email,
      createdUser.role,
    );

    return {
      ...tokens,
      user: createdUser,
    };
  }

  async bootstrapAdmin(registerDto: RegisterDto) {
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        role: Role.ADMIN,
      },
    });

    if (existingAdmin) {
      throw new BadRequestException('An admin account already exists');
    }

    const emailInUse = await this.userService.getUserEntityByEmail(registerDto.email);

    if (emailInUse) {
      throw new BadRequestException('Email already in use');
    }

    const createdUser = await this.userService.createUser({
      ...registerDto,
      role: Role.ADMIN,
    } satisfies CreateUserDto);

    const tokens = await this.generateUserTokens(
      createdUser.id,
      createdUser.email,
      createdUser.role,
    );

    return {
      ...tokens,
      user: createdUser,
    };
  }

  async refreshTokens(token: string) {
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: {
        token,
      },
      include: {
        user: true,
      },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Wrong refresh token');
    }

    if (existingToken.expiryDate.getTime() <= Date.now()) {
      await this.prisma.refreshToken.delete({
        where: {
          userId: existingToken.userId,
        },
      });

      throw new UnauthorizedException('Refresh token expired');
    }

    const tokens = await this.generateUserTokens(
      existingToken.user.id,
      existingToken.user.email,
      existingToken.user.role,
    );

    return {
      ...tokens,
      user: this.userService.toPublicUser(existingToken.user),
    };
  }

  async generateUserTokens(userId: number, email: string, role: Role) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      { expiresIn: '1h' },
    );
    const refreshToken = uuidv4();

    await this.storeRefreshToken(refreshToken, userId);

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(token: string, userId: number) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    await this.prisma.refreshToken.upsert({
      where: {
        userId,
      },
      create: {
        token,
        userId,
        expiryDate,
      },
      update: {
        token,
        expiryDate,
      },
    });
  }
}
