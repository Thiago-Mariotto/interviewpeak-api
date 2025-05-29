import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { InterviewFeedbackDto } from './dto/feedback.dto';
import { InterviewEngineService } from '../interview/interview-engine.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  private readonly _logger = new Logger(FeedbackService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _interviewEngine: InterviewEngineService,
  ) {}

  async generateFeedback(
    interviewId: string,
    userId?: string,
    isAdmin = false,
  ): Promise<InterviewFeedbackDto> {
    // Get the interview session
    const session = await this._prisma.interviewSession.findUnique({
      where: { id: interviewId },
    });

    if (!session) {
      throw new NotFoundException(`Interview session with ID ${interviewId} not found`);
    }

    // Check if user has permission to access this interview
    if (userId && !isAdmin && session.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to generate feedback for this interview',
      );
    }

    // Check if interview is completed
    if (session.status !== 'completed') {
      throw new BadRequestException(
        `Cannot generate feedback: interview is not completed. Current status: ${session.status}`,
      );
    }

    // Check if feedback already exists
    const existingFeedback = await this._prisma.interviewFeedback.findUnique({
      where: { sessionId: interviewId },
      include: { feedbackItems: true },
    });

    if (existingFeedback) {
      // Return existing feedback
      return this._mapFeedbackToDto(existingFeedback, existingFeedback.feedbackItems);
    }

    // Get conversation history
    const messages = await this._prisma.message.findMany({
      where: { sessionId: interviewId },
      orderBy: { timestamp: 'asc' },
    });

    if (!messages || messages.length === 0) {
      throw new BadRequestException('No interview messages found');
    }

    // Generate feedback using the interview engine
    const messageData = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      // Generate feedback data
      const feedbackData = await this._interviewEngine.generateFeedback(
        session.settings as any,
        messageData,
      );

      // Create feedback in database
      const feedback = await this._prisma.interviewFeedback.create({
        data: {
          id: uuidv4(),
          sessionId: interviewId,
          overallScore: feedbackData.overall_score,
          overallComment: feedbackData.overall_comment,
          strengths: feedbackData.strengths as any,
          areasToImprove: feedbackData.areas_to_improve as any,
        },
      });

      // Create feedback items
      const feedbackItems = [];
      for (const item of feedbackData.feedback_items) {
        const feedbackItem = await this._prisma.feedbackItem.create({
          data: {
            id: uuidv4(),
            feedbackId: feedback.id,
            category: item.category,
            score: item.score,
            comment: item.comment,
            improvementSuggestion: item.improvement_suggestion,
          },
        });
        feedbackItems.push(feedbackItem);
      }

      this._logger.log(`Generated feedback for interview: ${interviewId}`);

      // Return the feedback
      return this._mapFeedbackToDto(feedback, feedbackItems);
    } catch (error) {
      this._logger.error(`Error generating feedback: ${error.message}`);
      throw error;
    }
  }

  async getFeedback(
    interviewId: string,
    userId?: string,
    isAdmin = false,
  ): Promise<InterviewFeedbackDto> {
    // Get the interview to check permissions
    const session = await this._prisma.interviewSession.findUnique({
      where: { id: interviewId },
    });

    if (!session) {
      throw new NotFoundException(`Interview session with ID ${interviewId} not found`);
    }

    // Check if user has permission to access this interview
    if (userId && !isAdmin && session.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access feedback for this interview',
      );
    }

    // Get the feedback
    const feedback = await this._prisma.interviewFeedback.findUnique({
      where: { sessionId: interviewId },
      include: { feedbackItems: true },
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback not found for interview with ID ${interviewId}`);
    }

    // Return the feedback
    return this._mapFeedbackToDto(feedback, feedback.feedbackItems);
  }

  async getUserFeedbacks(userId: string): Promise<InterviewFeedbackDto[]> {
    // Get all feedbacks for user's interviews
    const userInterviews = await this._prisma.interviewSession.findMany({
      where: { userId },
      select: { id: true },
    });

    const interviewIds = userInterviews.map((interview) => interview.id);

    const feedbacks = await this._prisma.interviewFeedback.findMany({
      where: { sessionId: { in: interviewIds } },
      include: { feedbackItems: true },
    });

    return feedbacks.map((feedback) => this._mapFeedbackToDto(feedback, feedback.feedbackItems));
  }

  async getAllFeedbacks(): Promise<InterviewFeedbackDto[]> {
    // For admins to get all feedbacks in the system
    const allFeedbacks = await this._prisma.interviewFeedback.findMany({
      include: { feedbackItems: true },
    });

    return allFeedbacks.map((feedback) => this._mapFeedbackToDto(feedback, feedback.feedbackItems));
  }

  // Made public so it can be accessed by the controller
  _mapFeedbackToDto(feedback: any, feedbackItems: any[]): InterviewFeedbackDto {
    return {
      interviewId: feedback.sessionId,
      overallScore: feedback.overallScore,
      overallComment: feedback.overallComment,
      feedbackItems: feedbackItems.map((item) => ({
        category: item.category,
        score: item.score,
        comment: item.comment,
        improvementSuggestion: item.improvementSuggestion,
      })),
      strengths: feedback.strengths as string[],
      areasToImprove: feedback.areasToImprove as string[],
    };
  }
}
