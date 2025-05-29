import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

import {
  AdminInterviewFilterDto,
  AdminInterviewDetailsDto,
  AdminInterviewStatsDto,
  AdminInterviewListResponseDto,
} from './dto/interview.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feedbackService: FeedbackService,
  ) {}

  /**
   * Obtém todas as entrevistas com filtros e paginação
   */
  async getAllInterviews(filter: AdminInterviewFilterDto): Promise<AdminInterviewListResponseDto> {
    const { userId, status, type, startDate, endDate, page = 1, limit = 10 } = filter;

    // Construir o filtro para a consulta
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.interviewType = type;
    }

    if (startDate) {
      where.createdAt = {
        ...(where.createdAt || {}),
        gte: startDate,
      };
    }

    if (endDate) {
      where.createdAt = {
        ...(where.createdAt || {}),
        lte: endDate,
      };
    }

    // Calcular paginação
    const skip = (page - 1) * limit;

    // Obter total de registros
    const total = await this.prisma.interviewSession.count({ where });

    // Calcular total de páginas
    const totalPages = Math.ceil(total / limit);

    // Obter entrevistas
    const interviews = await this.prisma.interviewSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        feedback: {
          include: {
            feedbackItems: true,
          },
        },
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
    });

    // Mapear para o formato esperado pelo DTO
    const items = interviews.map((interview) => this.mapToAdminInterviewDetailsDto(interview));

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Obtém estatísticas gerais sobre entrevistas
   */
  async getInterviewStats(): Promise<AdminInterviewStatsDto> {
    // Total de entrevistas
    const totalInterviews = await this.prisma.interviewSession.count();

    // Entrevistas ativas (em andamento)
    const activeInterviews = await this.prisma.interviewSession.count({
      where: { status: 'in_progress' },
    });

    // Entrevistas concluídas
    const completedInterviews = await this.prisma.interviewSession.count({
      where: { status: 'completed' },
    });

    // Duração média das entrevistas concluídas
    const durationData = await this.prisma.interviewSession.aggregate({
      where: {
        status: 'completed',
        startTime: { not: null },
        endTime: { not: null },
      },
      _avg: {
        duration: true,
      },
    });

    // Entrevistas por tipo
    const interviewsByTypeRaw = await this.prisma.interviewSession.groupBy({
      by: ['interviewType'],
      _count: { id: true },
    });

    const interviewsByType = {
      basic: 0,
      specialized: 0,
    };

    interviewsByTypeRaw.forEach((item) => {
      if (item.interviewType === 'basic' || item.interviewType === 'specialized') {
        interviewsByType[item.interviewType] = item._count.id;
      }
    });

    // Entrevistas por status
    const interviewsByStatusRaw = await this.prisma.interviewSession.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const interviewsByStatus = {
      created: 0,
      in_progress: 0,
      paused: 0,
      completed: 0,
    };

    interviewsByStatusRaw.forEach((item) => {
      if (['created', 'in_progress', 'paused', 'completed'].includes(item.status)) {
        interviewsByStatus[item.status] = item._count.id;
      }
    });

    // Entrevistas recentes
    const recentInterviewsRaw = await this.prisma.interviewSession.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        feedback: {
          include: {
            feedbackItems: true,
          },
        },
      },
    });

    const recentInterviews = recentInterviewsRaw.map((interview) =>
      this.mapToAdminInterviewDetailsDto(interview),
    );

    return {
      totalInterviews,
      activeInterviews,
      completedInterviews,
      averageDuration: durationData._avg.duration || 0,
      interviewsByType,
      interviewsByStatus,
      recentInterviews,
    };
  }

  /**
   * Obtém detalhes de uma entrevista específica
   */
  async getInterviewById(id: string): Promise<AdminInterviewDetailsDto> {
    const interview = await this.prisma.interviewSession.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        feedback: {
          include: {
            feedbackItems: true,
          },
        },
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
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID ${id} not found`);
    }

    return this.mapToAdminInterviewDetailsDto(interview);
  }

  /**
   * Exclui uma entrevista e dados relacionados
   */
  async deleteInterview(id: string): Promise<void> {
    // Verificar se a entrevista existe
    const interview = await this.prisma.interviewSession.findUnique({
      where: { id },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID ${id} not found`);
    }

    // Excluir a entrevista (a cascata cuidará de mensagens e feedback)
    await this.prisma.interviewSession.delete({
      where: { id },
    });

    this.logger.log(`Interview with ID ${id} deleted successfully`);
  }

  /**
   * Gera feedback para uma entrevista
   */
  async generateFeedback(id: string): Promise<void> {
    // Verificar se a entrevista existe
    const interview = await this.prisma.interviewSession.findUnique({
      where: { id },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID ${id} not found`);
    }

    // Verificar se já existe feedback
    const existingFeedback = await this.prisma.interviewFeedback.findUnique({
      where: { sessionId: id },
    });

    if (existingFeedback) {
      throw new BadRequestException(`Feedback already exists for interview with ID ${id}`);
    }

    // Verificar se a entrevista está concluída
    if (interview.status !== 'completed') {
      throw new BadRequestException(
        'Cannot generate feedback for an interview that is not completed',
      );
    }

    // Gerar feedback usando o serviço de feedback
    await this.feedbackService.generateFeedback(id, interview.userId, true);

    this.logger.log(`Feedback generated for interview with ID ${id}`);
  }

  /**
   * Mapeia uma entrevista do Prisma para o DTO administrativo
   */
  private mapToAdminInterviewDetailsDto(interview: any): AdminInterviewDetailsDto {
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

      userId: interview.userId,
      userName: interview.user?.name || 'Unknown',
      userEmail: interview.user?.email || 'Unknown',

      messages: interview.messages,

      feedback: interview.feedback
        ? {
            id: interview.feedback.id,
            overallScore: interview.feedback.overallScore,
            overallComment: interview.feedback.overallComment,
            strengths: Array.isArray(interview.feedback.strengths)
              ? interview.feedback.strengths
              : [],
            areasToImprove: Array.isArray(interview.feedback.areasToImprove)
              ? interview.feedback.areasToImprove
              : [],
            feedbackItems: interview.feedback.feedbackItems.map((item) => ({
              id: item.id,
              category: item.category,
              score: item.score,
              comment: item.comment,
              improvementSuggestion: item.improvementSuggestion,
            })),
          }
        : undefined,
    };
  }
}
