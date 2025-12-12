import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { UserService } from "./user.service";
import type { User } from "@prisma/client";

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    async getAllUsers() {
        return this.userService.getAllUsers();
    }

    @Get(':id')
    async getUserById(@Param('id') id: string) {
        return this.userService.getUserById(Number(id))
    }

    @Get(':name')
    async getUserByUsername(@Param('name') name: string) {
        return this.userService.getUserByUsername(name);
    }

    @Post()
    async createUser(@Body() data: User) {
        return this.userService.createUser(data);
    }

    @Put(':id')
    async updateUser(@Param('id') id: string, @Body() data: User) {
        return this.userService.updateUser(Number(id), data);
    }

    @Get(':id')
    async deleteUser(@Param('id') id: string) {
        return this.userService.deleteUser(Number(id))
    }
}