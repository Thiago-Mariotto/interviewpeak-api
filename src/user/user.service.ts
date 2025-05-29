import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto, UserRole } from './dto/user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${createUserDto.email} already exists`);
    }

    // Hash the password
    const hashedPassword = await this.hashPassword(createUserDto.password);

    try {
      // Create the user
      const user = await this.prisma.user.create({
        data: {
          id: uuidv4(),
          name: createUserDto.name,
          email: createUserDto.email,
          password: hashedPassword,
          role: createUserDto.role || UserRole.USER,
        },
      });

      this.logger.log(`Created user: ${user.id}`);

      await this.grantTrialCredits(user.id);

      // Return user without password
      return this.excludePassword(user);
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return user;
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.excludePassword(user);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    await this.findById(id);

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.password = await this.hashPassword(updateUserDto.password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated user: ${id}`);

    return this.excludePassword(updatedUser);
  }

  async deleteUser(id: string): Promise<void> {
    await this.findById(id);

    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.log(`Deleted user: ${id}`);
  }

  async validateUserCredentials(email: string, password: string): Promise<UserResponseDto> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.comparePasswords(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.excludePassword(user);
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => this.excludePassword(user));
  }

  private excludePassword(user: any): UserResponseDto {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Concede créditos gratuitos de teste para um novo usuário
   * @param userId ID do usuário que receberá os créditos
   */
  async grantTrialCredits(userId: string): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const existingCredits = await this.prisma.interviewCredit.findFirst({
        where: {
          userId,
          creditType: 'basic_15min',
          purchaseId: null,
        },
      });

      if (existingCredits) {
        this.logger.log(`User already has free credits: ${userId}`);
        return;
      }

      await this.prisma.interviewCredit.create({
        data: {
          id: uuidv4(),
          userId,
          quantity: 1,
          remaining: 1,
          creditType: 'basic_15min',
          duration: 15,
          expiresAt,
        },
      });

      this.logger.log(`Added free credit for new user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error adding free credit: ${error.message}`);
      throw error;
    }
  }
}
