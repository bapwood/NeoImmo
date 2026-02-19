import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcryptjs';
import { SignInDto } from './dtos/signin.dtos';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { UserDto } from 'src/user/dto/user.dtos';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  async signIn(signInDto: SignInDto) {
    const existingUser = await this.userService.getUserByEmail(signInDto.email);

    if (!existingUser) {
      throw new UnauthorizedException('Wrong credentials');
    }

    const passwordMatch = await bcrypt.compare(signInDto.password, existingUser.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Wrong credentials');
    }

    const tokens = await this.generateUserTokens(existingUser.id);

    return { ...tokens, userId: existingUser.id };
  }

  async register(registerDto: UserDto): Promise<User> {
    const emailInUse = await this.userService.getUserByEmail(registerDto.email);

    if (emailInUse) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    return this.userService.createUser({
      email: registerDto.email,
      password: hashedPassword,
    });
  }

  async generateUserTokens(userId) {
    const accessToken = this.jwtService.sign({ userId }, { expiresIn: '1h' });
    const refreshToken = uuidv4();

    await this.storeRefreshToken(refreshToken, userId);

    return { accessToken, refreshToken };
  }

  async refreshTokens(token: string) {
    const existingToken = await this.prisma.refreshToken.findFirst({
      where: {
        token,
      }
    });

    if (!existingToken) {
      throw new UnauthorizedException();
    }

    return this.generateUserTokens(existingToken.userId);
  }

  async storeRefreshToken(token: string, userId) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);
    const data = { token, userId, expiryDate };

    const previousToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId
      }
    });

    if (!previousToken) {
      await this.prisma.refreshToken.create({
        data
      });
    } else {
      await this.prisma.refreshToken.update({
        where: {
          userId
        },
        data
      });
    }
  }
}
