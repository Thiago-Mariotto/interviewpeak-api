import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { LoginUserDto } from '../user/dto/user.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string; user: any }> {
    // Validate user credentials
    const user = await this.userService.validateUserCredentials(
      loginUserDto.email,
      loginUserDto.password,
    );

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role.toLocaleLowerCase() };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User logged in: ${user.id}`);

    return {
      accessToken,
      user,
    };
  }

  async validateUser(userId: string): Promise<any> {
    return this.userService.findById(userId);
  }
}
