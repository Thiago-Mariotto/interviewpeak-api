import {
  Controller,
  Post,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';

import { InterviewFeedbackDto } from './dto/feedback.dto';
import { FeedbackService } from './feedback.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('generate/:interview_id')
  async generateFeedback(
    @Param('interview_id') interviewId: string,
    @Request() req,
  ): Promise<InterviewFeedbackDto> {
    try {
      const isAdmin = req.user.role === 'admin';
      return await this.feedbackService.generateFeedback(interviewId, req.user.id, isAdmin);
    } catch (error) {
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.name === 'BadRequestException') {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error.name === 'ForbiddenException') {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      this.logger.error(`Error generating feedback: ${error.message}`);
      throw new HttpException(
        `Error generating feedback: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':interview_id')
  async getFeedback(
    @Param('interview_id') interviewId: string,
    @Request() req,
  ): Promise<InterviewFeedbackDto> {
    try {
      const isAdmin = req.user.role === 'admin';
      return await this.feedbackService.getFeedback(interviewId, req.user.id, isAdmin);
    } catch (error) {
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.name === 'ForbiddenException') {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      this.logger.error(`Error getting feedback: ${error.message}`);
      throw new HttpException(
        `Error getting feedback: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/all')
  async getUserFeedbacks(@Request() req): Promise<InterviewFeedbackDto[]> {
    try {
      return await this.feedbackService.getUserFeedbacks(req.user.id);
    } catch (error) {
      this.logger.error(`Error getting user feedbacks: ${error.message}`);
      throw new HttpException(
        `Error getting user feedbacks: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  async getAllFeedbacks(): Promise<InterviewFeedbackDto[]> {
    try {
      // Admin endpoint is handled in service
      return await this.feedbackService.getAllFeedbacks();
    } catch (error) {
      this.logger.error(`Error getting all feedbacks: ${error.message}`);
      throw new HttpException(
        `Error getting all feedbacks: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
