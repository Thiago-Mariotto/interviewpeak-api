import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AdminUserResponseDto, AdminUserRole, AdminUserStatsDto } from './dto/user.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca um usuário pelo email
   */
  async findUserByEmail(email: string): Promise<AdminUserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    // Remove o campo password
    const { password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      role: user.role as AdminUserRole,
    };
  }

  /**
   * Busca um usuário pelo ID
   */
  async findUserById(id: string): Promise<AdminUserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove o campo password
    const { password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      role: user.role as AdminUserRole,
    };
  }

  /**
   * Obtém os usuários mais recentes
   */
  async getLatestUsers(limit: number = 5): Promise<AdminUserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        role: user.role as AdminUserRole,
      };
    });
  }

  /**
   * Obtém todos os usuários
   */
  async getAllUsers(): Promise<AdminUserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        role: user.role as AdminUserRole,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Atualiza o papel/função de um usuário (user/admin)
   */
  async updateUserRole(userId: string, role: AdminUserRole): Promise<AdminUserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    this.logger.log(`Updated user role: ${userId} to ${role}`);

    // Remove o campo password
    const { password, ...userWithoutPassword } = updatedUser;
    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
      role: updatedUser.role as AdminUserRole,
    };
  }

  /**
   * Obtém estatísticas dos usuários
   */
  async getUserStats(): Promise<AdminUserStatsDto> {
    const now = new Date();

    // Define datas para hoje, início da semana e do mês
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Contagem total de usuários
    const totalUsers = await this.prisma.user.count();

    // Usuários ativos (com pelo menos uma entrevista)
    const activeUsers = await this.prisma.interviewSession.groupBy({
      by: ['userId'],
    });

    // Novos usuários nos diferentes períodos
    const newUsersToday = await this.prisma.user.count({
      where: {
        createdAt: { gte: startOfToday },
      },
    });

    const newUsersThisWeek = await this.prisma.user.count({
      where: {
        createdAt: { gte: startOfWeek },
      },
    });

    const newUsersThisMonth = await this.prisma.user.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    });

    // Usuários por papel/função
    const adminUsers = await this.prisma.user.count({
      where: { role: 'admin' },
    });

    const regularUsers = await this.prisma.user.count({
      where: { role: 'user' },
    });

    return {
      totalUsers,
      activeUsers: activeUsers.length,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      usersByRole: {
        admin: adminUsers,
        user: regularUsers,
      },
    };
  }
}
