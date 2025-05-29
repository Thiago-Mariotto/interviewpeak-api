import { Controller, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginUserDto } from '../user/dto/user.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    try {
      return await this.authService.login(loginUserDto);
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`);

      if (error.name === 'UnauthorizedException') {
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException(
        `Error during login: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
