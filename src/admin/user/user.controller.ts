import {
  Controller,
  Get,
  Param,
  Query,
  Put,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import {
  AdminUserResponseDto,
  AdminUserStatsDto,
  FindUserByEmailDto,
  UpdateUserRoleDto,
} from './dto/user.dto';
import { AdminUserService } from './user.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUserController {
  private readonly logger = new Logger(AdminUserController.name);

  constructor(private readonly userService: AdminUserService) {}

  @Get('search')
  async findUserByEmail(@Query() query: FindUserByEmailDto): Promise<AdminUserResponseDto> {
    try {
      return await this.userService.findUserByEmail(query.email);
    } catch (error) {
      this.logger.error(`Error finding user by email: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error finding user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<AdminUserResponseDto> {
    try {
      return await this.userService.findUserById(id);
    } catch (error) {
      this.logger.error(`Error getting user by ID: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error getting user by ID: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('latest')
  async getLatestUsers(@Query('limit') limit: number = 5): Promise<AdminUserResponseDto[]> {
    try {
      return await this.userService.getLatestUsers(limit);
    } catch (error) {
      this.logger.error(`Error getting latest users: ${error.message}`);
      throw new HttpException(
        `Error getting latest users: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getAllUsers(): Promise<AdminUserResponseDto[]> {
    try {
      return await this.userService.getAllUsers();
    } catch (error) {
      this.logger.error(`Error getting all users: ${error.message}`);
      throw new HttpException(
        `Error getting all users: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateUserRoleDto,
  ): Promise<AdminUserResponseDto> {
    try {
      return await this.userService.updateUserRole(id, updateRoleDto.role);
    } catch (error) {
      this.logger.error(`Error updating user role: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error updating user role: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getUserStats(): Promise<AdminUserStatsDto> {
    try {
      return await this.userService.getUserStats();
    } catch (error) {
      this.logger.error(`Error getting user stats: ${error.message}`);
      throw new HttpException(
        `Error getting user stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
