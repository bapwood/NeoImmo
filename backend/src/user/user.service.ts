import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    async getAllUsers(): Promise<User[]> {
        return this.prisma.user.findMany();
    }

    async getUserById(id: number): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: {
                id
            }
        });
    }

    async getUserByUsername(username: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: {
                username
            },
        });
    }

    async createUser(data: User): Promise<User> {
        return this.prisma.user.create({
            data
        });
    }

    async updateUser(id: number, data: User): Promise<User> {
        return this.prisma.user.update({
            where: {
                id
            },
            data
        })
    }

    async deleteUser(id: number): Promise<User> {
        return this.prisma.user.delete({
            where: {
                id
            }
        });
    }
}