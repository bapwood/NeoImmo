import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserDto } from "./dto/user.dtos";
import { ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags('user')
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @ApiResponse({ status: 200, description: 'All the users have been fetched' })
    @ApiResponse({ status: 404, description: 'No user in the database' })
    getAllUsers() {
        return this.userService.getAllUsers();
    }

    @Get(':id')
    @ApiResponse({ status: 200, description: 'The user have been fetched' })
    @ApiResponse({ status: 404, description: 'User not found' })
    getUserById(@Param('id') id: string) {
        return this.userService.getUserById(Number(id))
    }

    @Get(':email')
    @ApiResponse({ status: 200, description: 'The user have been fetched' })
    @ApiResponse({ status: 404, description: 'User not found' })
    getUserByEmail(@Param('email') email: string) {
        return this.userService.getUserByEmail(email)
    }

    @Post()
    @ApiResponse({ status: 200, description: 'The user have been created' })
    @ApiResponse({ status: 400, description: 'Wrong data input' })
    @ApiResponse({ status: 500, description: 'Could not create the user' })
    createUser(@Body() userDto: UserDto) {
        return this.userService.createUser(userDto);
    }

    @Put(':id')
    @ApiResponse({ status: 200, description: 'The user have been updated' })
    @ApiResponse({ status: 400, description: 'Wrong data input' })
    @ApiResponse({ status: 500, description: 'Could not update the user' })
    updateUser(@Param('id') id: string, @Body() userDto: UserDto) {
        return this.userService.updateUser(Number(id), userDto);
    }

    @Delete(':id')
    @ApiResponse({ status: 200, description: 'The user have been created' })
    @ApiResponse({ status: 500, description: 'Could not remove the user' })
    deleteUser(@Param('id') id: string) {
        return this.userService.deleteUser(Number(id))
    }
}