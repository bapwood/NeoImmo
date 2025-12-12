import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';

type AuthInput = { username: string, password: string };
type SignInData = { userId: number, username: string };
type AuthResult = { accessToken: string, userId: number, username: string };

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtSecret: JwtService
    ) {}

    async authenticate(input: AuthInput): Promise<AuthResult> {
        const user = await this.validateUser(input);

        if (!user) {
            throw new UnauthorizedException();
        }

        return this.signIn(user);
    }

    async validateUser(input: AuthInput): Promise<SignInData | null> {
        const user = await this.userService.getUserByUsername(input.username);

        if (user && user.password === input.password) {
            return {
                userId: user.id,
                username: user.username
            }
        }
        return null;
    }

    async signIn(user: SignInData): Promise<AuthResult> {
        const tokenPayload = {
            sub: user.userId,
            username: user.username
        };

        const accessToken = await this.jwtSecret.signAsync(tokenPayload);

        return { accessToken, username: user.username, userId: user.userId };
    }
}
