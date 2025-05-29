import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Request,
  Ip,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dto';
import { UserService } from './user.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IpService } from '../ip/ip.service';
import { SendgridService } from '../services/sendgrid/sendgrid.service';
import { geneerateCodeWithNumbers } from '../utils/codes';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly ipService: IpService,
    private readonly sendgridService: SendgridService,
    private readonly configService: ConfigService,
  ) { }

  @Post('register')
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Ip() ip: string,
    @Request() req,
  ): Promise<UserResponseDto> {
    try {
      const realIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || ip;
      // const isIpRegistered = await this.ipService.isIpRegistered(realIp);

      // if (isIpRegistered) {
      //   throw new HttpException('Você já possui uma conta cadastrada', HttpStatus.CONFLICT);
      // }

      const code = geneerateCodeWithNumbers();
      await this.sendgridService.send(
        {
          template: 'd-b32be4f762cd430faaed264ab81dae24',
          type: 'email',
          body: `Boas vindas ao InterviewPeak! <p>Seu código de verificação é: <strong>${code}</strong></p>`,
          subject: 'Bem-vindo ao InterviewPeak',
          title: 'Bem-vindo ao InterviewPeak',
          from: 'noreply@interviewpeak.com',
        },
        {
          to: createUserDto.email,
        },
      );
      return;

      const user = await this.userService.createUser(createUserDto);

      await this.ipService.registerIp(realIp, user.id);
      await this.userService.grantTrialCredits(user.id);

      return user;
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`);

      if (error.status === HttpStatus.CONFLICT) {
        throw error;
      }

      if (error.name === 'ConflictException') {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }

      throw new HttpException(
        `Error creating user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req): Promise<UserResponseDto> {
    try {
      return await this.userService.findById(req.user.id);
    } catch (error) {
      this.logger.error(`Error getting profile: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error getting profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async getAllUsers(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userService.findAll();
      return users;
    } catch (error) {
      this.logger.error(`Error getting all users: ${error.message}`);
      throw new HttpException(
        `Error getting all users: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    try {
      return await this.userService.findById(id);
    } catch (error) {
      this.logger.error(`Error getting user by ID: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error getting user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ): Promise<UserResponseDto> {
    try {
      // Check if the user is updating their own account or is an admin
      if (req.user.id !== id && req.user.role !== 'admin') {
        throw new HttpException('You can only update your own account', HttpStatus.FORBIDDEN);
      }

      return await this.userService.updateUser(id, updateUserDto);
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error updating user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.userService.deleteUser(id);
      return { message: `User with ID ${id} successfully deleted` };
    } catch (error) {
      this.logger.error(`Error deleting user: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error deleting user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
