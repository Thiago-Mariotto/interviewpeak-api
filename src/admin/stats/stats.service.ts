import { Injectable, Logger } from '@nestjs/common';

import {
  DashboardStatsDto,
  InterviewStatsDto,
  UserStatsDto,
  RevenueStatsDto,
  ConversionStatsDto,
  StatsOverviewDto,
  TimeSeriesDataDto,
} from './dto/stats.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém estatísticas para o dashboard administrativo
   */
  async getDashboardStats(): Promise<DashboardStatsDto> {
    try {
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
    } catch (error) {
      this.logger.error(`Error getting dashboard stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém estatísticas detalhadas sobre entrevistas
   */
  async getInterviewStats(days: number = 30): Promise<InterviewStatsDto> {
    try {
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
    } catch (error) {
      this.logger.error(`Error getting interview stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém estatísticas detalhadas sobre usuários
   */
  async getUserStats(days: number = 30): Promise<UserStatsDto> {
    try {
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
    } catch (error) {
      this.logger.error(`Error getting user stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém estatísticas detalhadas sobre receita
   */
  async getRevenueStats(days: number = 30): Promise<RevenueStatsDto> {
    try {
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
    } catch (error) {
      this.logger.error(`Error getting revenue stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de conversão
   */
  async getConversionStats(days: number = 30): Promise<ConversionStatsDto> {
    try {
      // Este é um exemplo simplificado
      // Em um cenário real, você precisaria de dados de eventos de usuário e tráfego

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Total de visitantes (simulado)
      const totalVisitors = (1000 * days) / 30; // 1000 visitantes a cada 30 dias

      // Total de registros
      const totalSignups = await this.prisma.user.count({
        where: {
          createdAt: { gte: startDate },
        },
      });

      // Usuários com pelo menos uma entrevista
      const usersWithOneInterviewRaw = await this.prisma.interviewSession.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: {
          id: true,
        },
      });

      const usersWithOneInterview = usersWithOneInterviewRaw.filter((user) => user._count.id >= 1);

      // Usuários com pelo menos duas entrevistas
      const usersWithTwoInterviews = usersWithOneInterviewRaw.filter((user) => user._count.id >= 2);

      // Usuários que fizeram compras
      const usersWithPurchases = await this.prisma.purchase.groupBy({
        by: ['userId'],
        where: {
          status: 'completed',
          createdAt: { gte: startDate },
        },
      });

      // Calcular taxas de conversão
      const visitorToSignupRate = totalSignups / totalVisitors;
      const signupToFirstInterviewRate = usersWithOneInterview.length / totalSignups;
      const firstInterviewToSecondRate =
        usersWithTwoInterviews.length / usersWithOneInterview.length;
      const trialToPaidRate = usersWithPurchases.length / totalSignups;

      // Conversão por canal (simulado)
      const conversionByChannel = {
        organic_search: 0.12,
        social_media: 0.08,
        direct: 0.15,
        referral: 0.1,
        email: 0.2,
      };

      return {
        visitorToSignupRate,
        signupToFirstInterviewRate,
        firstInterviewToSecondRate,
        trialToPaidRate,
        conversionByChannel,
      };
    } catch (error) {
      this.logger.error(`Error getting conversion stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém visão geral das estatísticas
   */
  async getStatsOverview(days: number = 30): Promise<StatsOverviewDto> {
    try {
      // Obter KPIs básicos
      const dashboardStats = await this.getDashboardStats();

      // Obter dados de série temporal para gráficos
      const revenueData = await this.getTimeSeriesData('revenue', days);
      const usersData = await this.getTimeSeriesData('users', days);
      const interviewsData = await this.getTimeSeriesData('interviews', days);

      return {
        kpis: {
          totalRevenue: dashboardStats.totalRevenue,
          totalUsers: dashboardStats.totalUsers,
          totalInterviews: dashboardStats.totalInterviews,
          activeUsers: dashboardStats.activeUsers.last30d,
        },
        revenueChart: revenueData,
        usersChart: usersData,
        interviewsChart: interviewsData,
      };
    } catch (error) {
      this.logger.error(`Error getting stats overview: ${error.message}`);
      throw error;
    }
  }

  /**
   * Método auxiliar para obter dados de séries temporais
   */
  private async getTimeSeriesData(dataType: string, days: number): Promise<TimeSeriesDataDto> {
    // Gerar array de datas
    const labels: string[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      labels.push(date.toISOString().split('T')[0]);
    }

    let data: number[] = [];

    switch (dataType) {
      case 'revenue':
        const revenueByDay = await this.getRevenueByDay(days);
        data = labels.map((date) => {
          const entry = revenueByDay.find((item) => item.date === date);
          return entry ? entry.amount : 0;
        });

        return {
          labels,
          datasets: [
            {
              label: 'Revenue',
              data,
              borderColor: '#4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
            },
          ],
        };

      case 'users':
        const usersByDay = await this.getCountByDay('user', days);
        const dailyUsers = labels.map((date) => {
          const entry = usersByDay.find((item) => item.date === date);
          return entry ? entry.count : 0;
        });

        // Calcular usuários acumulados
        const cumulativeUsers = [];
        let total = 0;
        for (const count of dailyUsers) {
          total += count;
          cumulativeUsers.push(total);
        }

        return {
          labels,
          datasets: [
            {
              label: 'Daily New Users',
              data: dailyUsers,
              borderColor: '#2196F3',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
            },
            {
              label: 'Total Users',
              data: cumulativeUsers,
              borderColor: '#9C27B0',
              backgroundColor: 'rgba(156, 39, 176, 0.1)',
            },
          ],
        };

      case 'interviews':
        const interviewsByDay = await this.getCountByDay('interviewSession', days);
        data = labels.map((date) => {
          const entry = interviewsByDay.find((item) => item.date === date);
          return entry ? entry.count : 0;
        });

        return {
          labels,
          datasets: [
            {
              label: 'Interviews',
              data,
              borderColor: '#FF9800',
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
            },
          ],
        };

      default:
        return {
          labels,
          datasets: [
            {
              label: 'Data',
              data: new Array(labels.length).fill(0),
              borderColor: '#000000',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            },
          ],
        };
    }
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
