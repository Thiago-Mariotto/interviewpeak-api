import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InterviewSession, Message, Prisma } from '@prisma/client';
import openAi from 'openai';
import { v4 as uuidv4 } from 'uuid';

import { InterviewProductType, InterviewSettingsDto } from './dto/interview.dto';
import { InterviewEngineService } from './interview-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductService } from '../services/stripe/product.service';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interviewEngine: InterviewEngineService,
    private readonly productService: ProductService,
  ) { }

  async createInterview(settings: InterviewSettingsDto, userId: string): Promise<InterviewSession> {
    try {
      const duration = settings.interviewDurationMinutes || 15;
      this.logger.log(
        `Creating interview session for user: ${userId} with settings: ${JSON.stringify(settings)}`,
      );

      // Determinar o tipo correto da entrevista
      const interviewType =
        settings.productType === InterviewProductType.SPECIALIZED ? 'specialized' : 'basic';

      const session = await this.prisma.interviewSession.create({
        data: {
          id: uuidv4(),
          settings: settings as unknown as Prisma.InputJsonValue,
          status: 'created',
          userId: userId,
          duration,
          // CORREÇÃO: Salvar os campos corretos
          interviewType: interviewType,
          careerLevel: settings.careerLevel || null,
          position: settings.specializedType || null,
          company: settings.companyName || null,
        },
      });

      this.logger.log(`Created interview session: ${session.id} for user: ${userId}`);
      return session;
    } catch (error) {
      this.logger.error(`Error creating interview: ${error}`);
      throw error;
    }
  }

  async getInterview(id: string, userId?: string, isAdmin = false): Promise<InterviewSession> {
    const session = await this.prisma.interviewSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Interview session with ID ${id} not found`);
    }

    if (userId && !isAdmin && session.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this interview');
    }

    return session;
  }

  async getUserInterviews(userId: string): Promise<InterviewSession[]> {
    return this.prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInterviewMessages(id: string, userId?: string, isAdmin = false): Promise<Message[]> {
    await this.getInterview(id, userId, isAdmin);

    const messages = await this.prisma.message.findMany({
      where: { sessionId: id },
      orderBy: { timestamp: 'asc' },
    });

    return messages;
  }

  async startInterview(id: string, userId?: string, isAdmin = false) {
    const session = await this.getInterview(id, userId, isAdmin);

    if (session.status !== 'created') {
      throw new BadRequestException(
        `Interview cannot be started: current status is ${session.status}`,
      );
    }

    const settings = session.settings as unknown as InterviewSettingsDto;

    let creditType: string;
    const duration = session.duration || 15;

    // CORREÇÃO: Verificar o productType das settings, não o interviewType da session
    if (settings.productType === InterviewProductType.SPECIALIZED) {
      creditType = 'specialized'; // Usar o tipo que está realmente no banco

      this.logger.log(
        `Iniciando entrevista especializada: ${id}, tipo: ${settings.specializedType}`,
      );
    } else {
      creditType = `basic_${duration}min`;

      this.logger.log(`Iniciando entrevista básica: ${id}, duração ${duration}min`);
    }

    try {
      await this.productService.useCredit(
        userId,
        id,
        creditType,
        duration,
        settings.specializedType?.toLowerCase().replace(/\s+/g, '_'), // Usar specializedType
        settings.companyName?.toLowerCase(),
      );
    } catch (error) {
      this.logger.error(`Error using credit: ${error.message}`);
      throw new ForbiddenException(
        'No available credits for this interview type. Please purchase credits first.',
      );
    }

    // Update session status
    await this.prisma.interviewSession.update({
      where: { id },
      data: {
        status: 'in_progress',
        startTime: new Date(),
        // CORREÇÃO: Salvar os campos corretos no banco
        interviewType:
          settings.productType === InterviewProductType.SPECIALIZED ? 'specialized' : 'basic',
        careerLevel: settings.careerLevel || null,
        position: settings.specializedType || null,
      },
    });

    return { openingMessage: await this.interviewEngine.generateOpening(settings) };
  }

  async endInterview(
    id: string,
    userId?: string,
    isAdmin = false,
  ): Promise<{ status: string; closingMessage: string }> {
    const session = await this.getInterview(id, userId, isAdmin);

    if (session.status !== 'in_progress') {
      throw new BadRequestException(
        `Interview cannot be ended: current status is ${session.status}`,
      );
    }

    await this.prisma.interviewSession.update({
      where: { id },
      data: {
        status: 'completed',
        endTime: new Date(),
      },
    });

    const closingMessage = await this.interviewEngine.generateClosing(
      session.settings as unknown as InterviewSettingsDto,
    );

    const MAX_CONTENT_LENGTH = 65000;
    let contentToStore = closingMessage;

    if (closingMessage.length > MAX_CONTENT_LENGTH) {
      this.logger.warn(
        `Closing message truncated from ${closingMessage.length} to ${MAX_CONTENT_LENGTH} characters`,
      );
      contentToStore = `${closingMessage.substring(0, MAX_CONTENT_LENGTH)}...`;
    }

    await this.prisma.message.create({
      data: {
        id: uuidv4(),
        sessionId: id,
        role: 'interviewer',
        content: contentToStore,
      },
    });

    this.logger.log(`Ended interview session: ${id}`);
    return { status: 'completed', closingMessage };
  }

  async createMessage(
    sessionId: string,
    role: string,
    content: string,
    userId?: string,
    isAdmin = false,
  ): Promise<Message> {
    await this.getInterview(sessionId, userId, isAdmin);
    const MAX_CONTENT_LENGTH = 65000;
    let safeContent = content;

    if (content.length > MAX_CONTENT_LENGTH) {
      this.logger.warn(
        `[${role}] Message content truncated from ${content.length} to ${MAX_CONTENT_LENGTH} characters for session ${sessionId}`,
      );
      safeContent = `${content.substring(0, MAX_CONTENT_LENGTH)}...`;
    }

    const message = await this.prisma.message.create({
      data: {
        id: uuidv4(),
        sessionId,
        role,
        content: safeContent,
      },
    });

    return message;
  }

  async generateResponse(
    sessionId: string,
    candidateMessage: string,
    userId?: string,
    isAdmin = false,
  ): Promise<{ content: string; timestamp: Date }> {
    const session = await this.getInterview(sessionId, userId, isAdmin);

    if (session.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot generate response: interview is not in progress. Current status: ${session.status}`,
      );
    }

    const MAX_CONTENT_LENGTH = 65000;
    let candidateMessageToStore = candidateMessage;

    if (candidateMessage.length > MAX_CONTENT_LENGTH) {
      this.logger.warn(
        `Candidate message truncated from ${candidateMessage.length} to ${MAX_CONTENT_LENGTH} characters`,
      );
      candidateMessageToStore = `${candidateMessage.substring(
        0,
        MAX_CONTENT_LENGTH,
      )}... (mensagem truncada devido ao limite de tamanho)`;
    }

    await this.createMessage(sessionId, 'candidate', candidateMessageToStore, userId, isAdmin);

    const messages = await this.getInterviewMessages(sessionId, userId, isAdmin);

    const response = await this.interviewEngine.generateResponse(
      session.settings as unknown as InterviewSettingsDto,
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    );

    let responseToStore = response;

    if (response.length > MAX_CONTENT_LENGTH) {
      this.logger.warn(
        `Interviewer response truncated from ${response.length} to ${MAX_CONTENT_LENGTH} characters`,
      );
      responseToStore = `${response.substring(
        0,
        MAX_CONTENT_LENGTH,
      )}... (mensagem truncada devido ao limite de tamanho)`;
    }

    const savedMessage = await this.createMessage(
      sessionId,
      'interviewer',
      responseToStore,
      userId,
      isAdmin,
    );

    return {
      content: response,
      timestamp: savedMessage.timestamp,
    };
  }

  async generateInterviewerResponse(
    sessionId: string,
    userId?: string,
    isAdmin = false,
  ): Promise<{ content: string; timestamp: Date }> {
    const session = await this.getInterview(sessionId, userId, isAdmin);

    if (session.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot generate response: interview is not in progress. Current status: ${session.status}`,
      );
    }

    // Obter todas as mensagens da entrevista sem modificá-las
    const messages = await this.getInterviewMessages(sessionId, userId, isAdmin);

    // REMOVIDO: Código que detectava e corrigia fluxos anômalos
    // Não adicionamos mais mensagens intermediárias fictícias

    const response = await this.interviewEngine.generateResponse(
      session.settings as unknown as InterviewSettingsDto,
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    );

    let responseToStore = response;
    const MAX_CONTENT_LENGTH = 65000;

    if (response.length > MAX_CONTENT_LENGTH) {
      this.logger.warn(
        `Interviewer response truncated from ${response.length} to ${MAX_CONTENT_LENGTH} characters`,
      );
      responseToStore = `${response.substring(
        0,
        MAX_CONTENT_LENGTH,
      )}... (mensagem truncada devido ao limite de tamanho)`;
    }

    const savedMessage = await this.createMessage(
      sessionId,
      'interviewer',
      responseToStore,
      userId,
      isAdmin,
    );

    return {
      content: response,
      timestamp: savedMessage.timestamp,
    };
  }

  async getAllInterviews(): Promise<InterviewSession[]> {
    return this.prisma.interviewSession.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteInterview(id: string, userId?: string, isAdmin = false): Promise<void> {
    await this.getInterview(id, userId, isAdmin);
    await this.prisma.interviewSession.delete({
      where: { id },
    });

    this.logger.log(`Deleted interview session: ${id}`);
  }

  async updateRemainingTime(
    id: string,
    remainingTime: number,
    userId?: string,
    isAdmin = false,
  ): Promise<void> {
    const session = await this.getInterview(id, userId, isAdmin);

    if (session.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot update time: interview is not in progress. Current status: ${session.status}`,
      );
    }

    await this.prisma.interviewSession.update({
      where: { id },
      data: {
        pausedTimeMs: remainingTime,
        lastUpdatedTimeAt: new Date(),
      },
    });

    this.logger.debug(`Updated remaining time for interview ${id}: ${remainingTime}ms`);
  }

  async handleTimeRunningOut(
    id: string,
    userId?: string,
    isAdmin = false,
  ): Promise<{ content: string; timestamp: Date }> {
    const session = await this.getInterview(id, userId, isAdmin);

    if (session.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot handle time running out: interview is not in progress. Current status: ${session.status}`,
      );
    }

    await this.prisma.interviewSession.update({
      where: { id },
      data: {
        isFinishing: true,
      },
    });

    const messages = await this.getInterviewMessages(id, userId, isAdmin);
    const settings = session.settings as unknown as InterviewSettingsDto;
    const isPortuguese = this.detectLanguage(settings);

    const finalPrompt = isPortuguese
      ? 'O tempo da entrevista está acabando. Por favor, faça sua pergunta final e prepare-se para encerrar a entrevista graciosamente. Não mencione que o tempo está acabando, simplesmente formule sua pergunta final de forma natural.'
      : "The interview time is running out. Please ask your final question and prepare to gracefully end the interview. Don't mention that time is running out, just naturally formulate your final question.";

    const finalResponse = await this.interviewEngine.generateTimeRunningOutResponse(
      settings,
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      finalPrompt,
    );

    let responseToStore = finalResponse;
    const MAX_CONTENT_LENGTH = 65000;

    if (finalResponse.length > MAX_CONTENT_LENGTH) {
      this.logger.warn(
        `Final response truncated from ${finalResponse.length} to ${MAX_CONTENT_LENGTH} characters`,
      );
      responseToStore = `${finalResponse.substring(
        0,
        MAX_CONTENT_LENGTH,
      )}... (mensagem truncada devido ao limite de tamanho)`;
    }

    const savedMessage = await this.createMessage(
      id,
      'interviewer',
      responseToStore,
      userId,
      isAdmin,
    );

    return {
      content: finalResponse,
      timestamp: savedMessage.timestamp,
    };
  }

  async generateResponseStream(
    sessionId: string,
    candidateMessage: string,
    userId?: string,
    isAdmin = false,
  ): Promise<{
    stream: AsyncIterable<openAi.Chat.Completions.ChatCompletionChunk>;
    messageId: string;
  }> {
    const session = await this.getInterview(sessionId, userId, isAdmin);

    if (session.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot generate response: interview is not in progress. Current status: ${session.status}`,
      );
    }

    const MAX_CONTENT_LENGTH = 65000;
    let candidateMessageToStore = candidateMessage;

    if (candidateMessage.length > MAX_CONTENT_LENGTH) {
      this.logger.warn(
        `Candidate message truncated from ${candidateMessage.length} to ${MAX_CONTENT_LENGTH} characters`,
      );
      candidateMessageToStore = `${candidateMessage.substring(0, MAX_CONTENT_LENGTH)}...`;
    }

    await this.createMessage(sessionId, 'candidate', candidateMessageToStore, userId, isAdmin);
    const messageId = uuidv4();

    // Iniciar um documento vazio para esta mensagem - será atualizado conforme o streaming avança
    await this.prisma.message.create({
      data: {
        id: messageId,
        sessionId,
        role: 'interviewer',
        content: '', // Será atualizado durante o streaming
      },
    });

    // Obter as mensagens atualizadas para incluir a mensagem do candidato que acabamos de adicionar
    const messages = await this.getInterviewMessages(sessionId, userId, isAdmin);

    // Gerar resposta via streaming
    const stream = await this.interviewEngine.generateResponseStream(
      session.settings as unknown as InterviewSettingsDto,
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    );

    return { stream, messageId };
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    const MAX_CONTENT_LENGTH = 65000;
    let contentToStore = content;

    if (content.length > MAX_CONTENT_LENGTH) {
      this.logger.warn(
        `Message content truncated from ${content.length} to ${MAX_CONTENT_LENGTH} characters`,
      );
      contentToStore = `${content.substring(
        0,
        MAX_CONTENT_LENGTH,
      )}... (mensagem truncada devido ao limite de tamanho)`;
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: contentToStore },
    });
  }

  private detectLanguage(settings: any): boolean {
    if (settings.customInstructions) {
      const customInstructions = settings.customInstructions.toLowerCase();

      if (
        customInstructions.includes('português') ||
        customInstructions.includes('brasil') ||
        customInstructions.includes('brasileiro')
      ) {
        return true;
      }
    }

    // Verificar o título do cargo
    if (settings.jobTitle) {
      const jobTitle = settings.jobTitle.toLowerCase();
      const portugueseKeywords = [
        'desenvolvedor',
        'analista',
        'engenheiro',
        'técnico',
        'programador',
        'gerente',
        'coordenador',
        'líder',
      ];

      for (const keyword of portugueseKeywords) {
        if (jobTitle.includes(keyword)) {
          return true;
        }
      }
    }

    return false;
  }
}
