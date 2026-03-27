import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { CreateUserDto, UpdateUserDto } from './dto/user.dtos';
import { UserService } from './user.service';

@ApiTags('user')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiResponse({ status: 200, description: 'Current authenticated user fetched' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@Req() request: AuthenticatedRequest) {
    return this.userService.getUserById(request.user.userId);
  }

  @Put('me')
  @ApiResponse({ status: 200, description: 'Current authenticated user updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() userDto: UpdateUserDto,
  ) {
    const { role: _role, ...safeUserDto } = userDto;
    return this.userService.updateUser(request.user.userId, safeUserDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'All the users have been fetched' })
  @ApiResponse({ status: 404, description: 'No user in the database' })
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get('email/:email')
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'The user has been fetched' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserByEmail(@Param('email') email: string) {
    return this.userService.getUserByEmail(email);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'The user has been fetched' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'The user has been created' })
  @ApiResponse({ status: 400, description: 'Wrong data input' })
  @ApiResponse({ status: 500, description: 'Could not create the user' })
  createUser(@Body() userDto: CreateUserDto) {
    return this.userService.createUser(userDto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'The user has been updated' })
  @ApiResponse({ status: 400, description: 'Wrong data input' })
  @ApiResponse({ status: 500, description: 'Could not update the user' })
  updateUser(@Param('id') id: string, @Body() userDto: UpdateUserDto) {
    return this.userService.updateUser(Number(id), userDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiResponse({ status: 200, description: 'The user has been deleted' })
  @ApiResponse({ status: 500, description: 'Could not remove the user' })
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(Number(id));
  }
}
