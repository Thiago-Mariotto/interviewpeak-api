import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import {
  AdminCreditActionDto,
  BatchCreditActionDto,
  BatchCreditResponseDto,
  CreditActionType,
  CreditResponseDto,
  UserInterviewDetailsDto,
  DashboardStatsDto,
  InterviewStatsDto,
  UserStatsDto,
  RevenueStatsDto,
} from './dto/admin.dto';
import { UserResponseDto, UserRole } from '../user/dto/user.dto';
import { CreditSummaryDto } from './system/dto/system.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * Busca um usuário pelo email
   */
  async findUserByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    // Remove o campo password
    const { password, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, role: userWithoutPassword.role as UserRole };
  }

  /**
   * Obtém os créditos de um usuário
   */
  async getUserCredits(userId: string): Promise<CreditResponseDto[]> {
    // Verifica se o usuário existe
    await this.userService.findById(userId);

    const credits = await this.prisma.interviewCredit.findMany({
      where: { userId },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });

    return credits;
  }

  /**
   * Obtém o histórico de entrevistas de um usuário
   */
  async getUserInterviews(userId: string): Promise<UserInterviewDetailsDto[]> {
    // Verifica se o usuário existe
    await this.userService.findById(userId);

    // Buscar entrevistas do usuário com informações de feedback
    const interviews = await this.prisma.interviewSession.findMany({
      where: { userId },
      include: {
        feedback: {
          include: {
            feedbackItems: true,
          },
        },
        credit: true,
        messages: {
          select: {
            id: true,
            role: true,
            content: true,
            timestamp: true,
          },
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transformar os resultados para o formato DTO correto, lidando com os tipos Json
    return interviews.map((interview) => {
      // Se não houver feedback, retorna null para este campo
      const processedFeedback = interview.feedback
        ? {
            id: interview.feedback.id,
            overallScore: interview.feedback.overallScore,
            overallComment: interview.feedback.overallComment,
            // Converter Json para string[]
            strengths: Array.isArray(interview.feedback.strengths)
              ? (interview.feedback.strengths as string[])
              : [],
            areasToImprove: Array.isArray(interview.feedback.areasToImprove)
              ? (interview.feedback.areasToImprove as string[])
              : [],
            feedbackItems: interview.feedback.feedbackItems.map((item) => ({
              id: item.id,
              category: item.category,
              score: item.score,
              comment: item.comment,
              improvementSuggestion: item.improvementSuggestion,
            })),
          }
        : undefined;

      // Construir o objeto DTO no formato esperado
      return {
        id: interview.id,
        settings: interview.settings,
        status: interview.status,
        duration: interview.duration,
        startTime: interview.startTime,
        endTime: interview.endTime,
        pausedTimeMs: interview.pausedTimeMs,
        interviewType: interview.interviewType,
        position: interview.position,
        company: interview.company,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
        feedback: processedFeedback,
        credit: interview.credit
          ? {
              id: interview.credit.id,
              creditType: interview.credit.creditType,
              quantity: interview.credit.quantity,
              remaining: interview.credit.remaining,
              expiresAt: interview.credit.expiresAt,
            }
          : undefined,
        messages: interview.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
      };
    });
  }

  /**
   * Gerencia ações de crédito (adicionar ou remover)
   */
  async manageCreditAction(actionDto: AdminCreditActionDto): Promise<CreditResponseDto> {
    // Verificar se o usuário existe
    await this.userService.findById(actionDto.userId);

    // Definir data de expiração se não foi fornecida
    let expiresAt: Date;
    if (actionDto.expiresAt) {
      expiresAt = new Date(actionDto.expiresAt);
    } else {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Padrão: 30 dias
    }

    if (actionDto.action === CreditActionType.ADD) {
      // Adicionar créditos
      const newCredit = await this.prisma.interviewCredit.create({
        data: {
          id: uuidv4(),
          userId: actionDto.userId,
          quantity: actionDto.quantity,
          remaining: actionDto.quantity,
          creditType: actionDto.creditType,
          duration: actionDto.duration,
          position: actionDto.position,
          company: actionDto.company,
          expiresAt,
        },
      });

      this.logger.log(
        `Added ${actionDto.quantity} credits of type ${actionDto.creditType} to user ${actionDto.userId}`,
      );
      return newCredit;
    } else if (actionDto.action === CreditActionType.REMOVE) {
      // Buscar créditos existentes
      const existingCredits = await this.prisma.interviewCredit.findMany({
        where: {
          userId: actionDto.userId,
          creditType: actionDto.creditType,
          remaining: { gt: 0 },
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: 'asc' },
      });

      if (!existingCredits.length) {
        throw new BadRequestException(
          `No active credits of type ${actionDto.creditType} found for user ${actionDto.userId}`,
        );
      }

      // Determinar quantos créditos remover
      let remainingToRemove = actionDto.quantity;
      const updatedCredits: string[] = [];

      for (const credit of existingCredits) {
        if (remainingToRemove <= 0) break;

        const toRemoveFromCredit = Math.min(credit.remaining, remainingToRemove);
        const newRemaining = credit.remaining - toRemoveFromCredit;

        await this.prisma.interviewCredit.update({
          where: { id: credit.id },
          data: { remaining: newRemaining },
        });

        updatedCredits.push(credit.id);
        remainingToRemove -= toRemoveFromCredit;
      }

      if (remainingToRemove > 0) {
        throw new BadRequestException(
          `Could not remove all ${actionDto.quantity} credits. Only removed ${actionDto.quantity - remainingToRemove}`,
        );
      }

      this.logger.log(
        `Removed ${actionDto.quantity} credits of type ${actionDto.creditType} from user ${actionDto.userId}`,
      );

      // Retornar o último crédito atualizado
      return await this.prisma.interviewCredit.findUnique({
        where: { id: updatedCredits[updatedCredits.length - 1] },
      });
    } else {
      throw new BadRequestException(`Invalid action: ${actionDto.action}`);
    }
  }

  /**
   * Obtém os usuários mais recentes
   */
  async getLatestUsers(limit: number = 5): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return { ...userWithoutPassword, role: userWithoutPassword.role as UserRole };
    });
  }

  /**
   * Obtém um usuário por ID
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, role: userWithoutPassword.role as UserRole };
  }

  /**
   * Obtém um resumo dos créditos no sistema
   */
  async getCreditsSummary(): Promise<CreditSummaryDto> {
    const now = new Date();

    // Total de créditos emitidos
    const totalCredits = await this.prisma.interviewCredit.aggregate({
      _sum: {
        quantity: true,
      },
    });

    // Créditos ativos (não expirados e com saldo)
    const activeCredits = await this.prisma.interviewCredit.aggregate({
      where: {
        remaining: { gt: 0 },
        expiresAt: { gt: now },
      },
      _sum: {
        remaining: true,
      },
    });

    // Créditos expirados
    const expiredCredits = await this.prisma.interviewCredit.aggregate({
      where: {
        expiresAt: { lt: now },
        remaining: { gt: 0 },
      },
      _sum: {
        remaining: true,
      },
    });

    // Distribuição por tipo de crédito
    const creditsByTypeRaw = await this.prisma.interviewCredit.groupBy({
      by: ['creditType'],
      where: {
        remaining: { gt: 0 },
        expiresAt: { gt: now },
      },
      _sum: {
        remaining: true,
      },
    });

    const creditsByType: Record<string, number> = {};
    creditsByTypeRaw.forEach((item) => {
      creditsByType[item.creditType] = item._sum.remaining || 0;
    });

    return {
      totalCreditsIssued: totalCredits._sum.quantity || 0,
      activeCredits: activeCredits._sum.remaining || 0,
      expiredCredits: expiredCredits._sum.remaining || 0,
      usedCredits:
        (totalCredits._sum.quantity || 0) -
        (activeCredits._sum.remaining || 0) -
        (expiredCredits._sum.remaining || 0),
      creditsByType,
    };
  }
  async processBatchCredits(batchDto: BatchCreditActionDto): Promise<BatchCreditResponseDto> {
    if (!batchDto.users || batchDto.users.length === 0) {
      throw new BadRequestException('No users provided in batch');
    }

    // Preparar resultado
    const result: BatchCreditResponseDto = {
      successful: 0,
      failed: 0,
      totalUsers: batchDto.users.length,
      errors: [],
      processedCredits: [],
    };

    // Definir data de expiração se não foi fornecida
    let expiresAt: Date;
    if (batchDto.expiresAt) {
      expiresAt = new Date(batchDto.expiresAt);
    } else {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Padrão: 30 dias
    }

    // Processar cada usuário
    for (const userItem of batchDto.users) {
      try {
        // Buscar o usuário pelo email
        const user = await this.prisma.user.findUnique({
          where: { email: userItem.email },
        });

        if (!user) {
          if (batchDto.skipNonExistingUsers) {
            result.errors.push({
              email: userItem.email,
              reason: 'User not found, skipped',
            });
            result.failed++;
            continue;
          } else {
            throw new NotFoundException(`User with email ${userItem.email} not found`);
          }
        }

        // Criar crédito para o usuário
        const newCredit = await this.prisma.interviewCredit.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            quantity: userItem.quantity,
            remaining: userItem.quantity,
            creditType: batchDto.creditType,
            duration: batchDto.duration,
            position: batchDto.position,
            company: batchDto.company,
            expiresAt,
          },
        });

        result.successful++;
        result.processedCredits.push(newCredit);
        this.logger.log(
          `Added ${userItem.quantity} credits of type ${batchDto.creditType} to user ${user.id} (${userItem.email})`,
        );
      } catch (error) {
        result.failed++;
        result.errors.push({
          email: userItem.email,
          reason: error.message,
        });
        this.logger.error(`Failed to add credits for user ${userItem.email}: ${error.message}`);
      }
    }

    // Registrar a operação em lote
    this.logger.log(
      `Batch credit operation completed: ${result.successful} successful, ${result.failed} failed out of ${result.totalUsers} total users. Reason: ${batchDto.reason || 'Not specified'}`,
    );

    return result;
  }

  /**
   * Obtém estatísticas para o dashboard administrativo
   */
  async getDashboardStats(): Promise<DashboardStatsDto> {
    // Determinar períodos de tempo
    const now = new Date();
    const last24h = new Date(now);
    last24h.setDate(now.getDate() - 1);

    const last7d = new Date(now);
    last7d.setDate(now.getDate() - 7);

    const last30d = new Date(now);
    last30d.setDate(now.getDate() - 30);

    // Contagens de usuários
    const totalUsers = await this.prisma.user.count();

    const activeUsers24h = await this.prisma.interviewSession.groupBy({
      by: ['userId'],
      where: {
        updatedAt: { gte: last24h },
      },
      _count: true,
    });

    const activeUsers7d = await this.prisma.interviewSession.groupBy({
      by: ['userId'],
      where: {
        updatedAt: { gte: last7d },
      },
      _count: true,
    });

    const activeUsers30d = await this.prisma.interviewSession.groupBy({
      by: ['userId'],
      where: {
        updatedAt: { gte: last30d },
      },
      _count: true,
    });

    // Contagens de entrevistas
    const totalInterviews = await this.prisma.interviewSession.count();
    const totalCompletedInterviews = await this.prisma.interviewSession.count({
      where: { status: 'completed' },
    });

    // Contagens de créditos
    const creditsAggregate = await this.prisma.interviewCredit.aggregate({
      _sum: {
        quantity: true,
        remaining: true,
      },
    });

    // Receita total
    const revenueAggregate = await this.prisma.purchase.aggregate({
      where: { status: 'completed' },
      _sum: {
        amount: true,
      },
    });

    return {
      totalUsers,
      totalInterviews,
      totalCompletedInterviews,
      totalRevenue: revenueAggregate._sum.amount || 0,
      activeUsers: {
        last24h: activeUsers24h.length,
        last7d: activeUsers7d.length,
        last30d: activeUsers30d.length,
      },
      creditsUsed: (creditsAggregate._sum.quantity || 0) - (creditsAggregate._sum.remaining || 0),
      creditsRemaining: creditsAggregate._sum.remaining || 0,
    };
  }

  /**
   * Obtém estatísticas detalhadas sobre entrevistas
   */
  async getInterviewStats(days: number = 30): Promise<InterviewStatsDto> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Contagem total de entrevistas no período
    const totalInterviews = await this.prisma.interviewSession.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Entrevistas completadas
    const completedInterviews = await this.prisma.interviewSession.count({
      where: {
        status: 'completed',
        createdAt: { gte: startDate },
      },
    });

    // Duração média (em minutos)
    const durationResult = await this.prisma.interviewSession.aggregate({
      where: {
        status: 'completed',
        startTime: { not: null },
        endTime: { not: null },
        createdAt: { gte: startDate },
      },
      _avg: {
        duration: true,
      },
    });

    // Entrevistas por tipo
    const interviewsByTypeRaw = await this.prisma.interviewSession.groupBy({
      by: ['interviewType'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    });

    const interviewsByType = interviewsByTypeRaw.reduce(
      (acc, curr) => {
        acc[curr.interviewType] = curr._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Entrevistas por dia
    const interviewsByDay = await this.getCountByDay('interviewSession', days);

    return {
      totalInterviews,
      completedInterviews,
      avgDuration: durationResult._avg.duration || 0,
      interviewsByType,
      interviewsByDay,
    };
  }

  /**
   * Obtém estatísticas detalhadas sobre usuários
   */
  async getUserStats(days: number = 30): Promise<UserStatsDto> {
    const now = new Date();

    const last24h = new Date(now);
    last24h.setDate(now.getDate() - 1);

    const last7d = new Date(now);
    last7d.setDate(now.getDate() - 7);

    const last30d = new Date(now);
    last30d.setDate(now.getDate() - 30);

    // Total de usuários
    const totalUsers = await this.prisma.user.count();

    // Novos usuários nos diferentes períodos
    const newUsers24h = await this.prisma.user.count({
      where: { createdAt: { gte: last24h } },
    });

    const newUsers7d = await this.prisma.user.count({
      where: { createdAt: { gte: last7d } },
    });

    const newUsers30d = await this.prisma.user.count({
      where: { createdAt: { gte: last30d } },
    });

    // Usuários ativos (com pelo menos uma entrevista) nos diferentes períodos
    const activeUsers24h = await this.prisma.interviewSession.groupBy({
      by: ['userId'],
      where: { updatedAt: { gte: last24h } },
    });

    const activeUsers7d = await this.prisma.interviewSession.groupBy({
      by: ['userId'],
      where: { updatedAt: { gte: last7d } },
    });

    const activeUsers30d = await this.prisma.interviewSession.groupBy({
      by: ['userId'],
      where: { updatedAt: { gte: last30d } },
    });

    // Usuários por dia
    const usersByDay = await this.getCountByDay('user', days);

    return {
      totalUsers,
      newUsers: {
        last24h: newUsers24h,
        last7d: newUsers7d,
        last30d: newUsers30d,
      },
      activeUsers: {
        last24h: activeUsers24h.length,
        last7d: activeUsers7d.length,
        last30d: activeUsers30d.length,
      },
      usersByDay,
    };
  }

  /**
   * Obtém estatísticas detalhadas sobre receita
   */
  async getRevenueStats(days: number = 30): Promise<RevenueStatsDto> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Receita total
    const totalRevenueResult = await this.prisma.purchase.aggregate({
      where: {
        status: 'completed',
        createdAt: { gte: startDate },
      },
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = totalRevenueResult._sum.amount || 0;

    // Receita por produto
    const revenueByProductRaw = await this.prisma.purchase.findMany({
      where: {
        status: 'completed',
        createdAt: { gte: startDate },
      },
      include: {
        price: {
          include: {
            product: true,
          },
        },
      },
    });

    const revenueByProduct: Record<string, number> = {};
    revenueByProductRaw.forEach((purchase) => {
      const productName = purchase.price.product.name;
      if (!revenueByProduct[productName]) {
        revenueByProduct[productName] = 0;
      }
      revenueByProduct[productName] += purchase.amount;
    });

    // Receita por dia
    const revenueByDay = await this.getRevenueByDay(days);

    return {
      totalRevenue,
      revenueByProduct,
      revenueByDay,
    };
  }

  /**
   * Método auxiliar para obter contagens diárias para qualquer modelo
   */
  private async getCountByDay(
    modelName: string,
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const result = [];
    const today = new Date();

    // Gerar um array com todas as datas no período
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      // Consultar contagem para esta data
      const count = await this.prisma[modelName].count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      const dateString = date.toISOString().split('T')[0];
      result.push({ date: dateString, count });
    }

    return result;
  }

  /**
   * Método auxiliar para obter receita diária
   */
  private async getRevenueByDay(days: number): Promise<Array<{ date: string; amount: number }>> {
    const result = [];
    const today = new Date();

    // Gerar um array com todas as datas no período
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      // Consultar receita para esta data
      const amountResult = await this.prisma.purchase.aggregate({
        where: {
          status: 'completed',
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const dateString = date.toISOString().split('T')[0];
      result.push({ date: dateString, amount: amountResult._sum.amount || 0 });
    }

    return result;
  }
}
