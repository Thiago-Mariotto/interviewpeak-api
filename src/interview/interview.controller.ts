import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { InterviewSession, Message } from '@prisma/client';

import { InterviewSettingsDto, CreateMessageDto } from './dto/interview.dto';
import { InterviewService } from './interview.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewController {
  private readonly _logger = new Logger(InterviewController.name);

  constructor(private readonly _interviewService: InterviewService) {}

  @Post('create')
  async createInterview(
    @Body() settings: InterviewSettingsDto,
    @Request() req,
  ): Promise<InterviewSession> {
    try {
      return await this._interviewService.createInterview(settings, req.user.id);
    } catch (error) {
      this._logger.error(`Error creating interview: ${error.message}`);
      throw new HttpException(
        `Failed to create interview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('my-interviews')
  async getUserInterviews(@Request() req): Promise<InterviewSession[]> {
    try {
      return await this._interviewService.getUserInterviews(req.user.id);
    } catch (error) {
      this._logger.error(`Error getting user interviews: ${error.message}`);
      throw new HttpException(
        `Failed to get user interviews: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':interview_id')
  async getInterview(@Param('interview_id') id: string, @Request() req): Promise<InterviewSession> {
    try {
      const isAdmin = req.user.role === 'admin';
      return await this._interviewService.getInterview(id, req.user.id, isAdmin);
    } catch (error) {
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.name === 'ForbiddenException') {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      this._logger.error(`Error getting interview: ${error.message}`);
      throw new HttpException(
        `Failed to get interview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':interview_id/messages')
  async getInterviewMessages(
    @Param('interview_id') id: string,
    @Request() req,
  ): Promise<Message[]> {
    try {
      const isAdmin = req.user.role === 'admin';
      return await this._interviewService.getInterviewMessages(id, req.user.id, isAdmin);
    } catch (error) {
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.name === 'ForbiddenException') {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      this._logger.error(`Error getting interview messages: ${error.message}`);
      throw new HttpException(
        `Failed to get interview messages: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':interview_id/start')
  async startInterview(@Param('interview_id') id: string, @Request() req) {
    try {
      const isAdmin = req.user.role === 'admin';
      return await this._interviewService.startInterview(id, req.user.id, isAdmin);
    } catch (error) {
      if (error.name === 'BadRequestException') {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.name === 'ForbiddenException') {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      this._logger.error(`Error starting interview: ${error.message}`);
      throw new HttpException(
        `Failed to start interview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':interview_id/end')
  async endInterview(
    @Param('interview_id') id: string,
    @Request() req,
  ): Promise<{ status: string; closingMessage: string }> {
    try {
      const isAdmin = req.user.role === 'admin';
      const result = await this._interviewService.endInterview(id, req.user.id, isAdmin);
      return {
        status: result.status,
        closingMessage: result.closingMessage,
      };
    } catch (error) {
      if (error.name === 'BadRequestException') {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.name === 'ForbiddenException') {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      this._logger.error(`Error ending interview: ${error.message}`);
      throw new HttpException(
        `Failed to end interview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Novos endpoints para suporte a REST API

  @Post(':interview_id/messages/add')
  async addMessage(
    @Param('interview_id') id: string,
    @Body() messageData: CreateMessageDto,
    @Request() req,
  ): Promise<Message> {
    try {
      const isAdmin = req.user.role === 'admin';

      if (!messageData.role || !messageData.content) {
        throw new BadRequestException('Role and content are required fields');
      }

      return await this._interviewService.createMessage(
        id,
        messageData.role,
        messageData.content,
        req.user.id,
        isAdmin,
      );
    } catch (error) {
      this._logger.error(`Error adding message: ${error.message}`);
      throw new HttpException(
        `Failed to add message: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':interview_id/response')
  async generateResponse(
    @Param('interview_id') id: string,
    @Request() req,
  ): Promise<{ content: string; timestamp: string }> {
    try {
      const isAdmin = req.user.role === 'admin';
      const response = await this._interviewService.generateInterviewerResponse(
        id,
        req.user.id,
        isAdmin,
      );

      return {
        content: response.content,
        timestamp: response.timestamp.toISOString(),
      };
    } catch (error) {
      this._logger.error(`Error generating response: ${error.message}`);
      throw new HttpException(
        `Failed to generate response: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':interview_id')
  async deleteInterview(
    @Param('interview_id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    try {
      const isAdmin = req.user.role === 'admin';
      await this._interviewService.deleteInterview(id, req.user.id, isAdmin);
      return { message: `Interview session with ID ${id} successfully deleted` };
    } catch (error) {
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.name === 'ForbiddenException') {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      this._logger.error(`Error deleting interview: ${error.message}`);
      throw new HttpException(
        `Failed to delete interview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  async getAllInterviews(): Promise<InterviewSession[]> {
    try {
      // This endpoint is for admins to get all interviews
      return await this._interviewService.getAllInterviews();
    } catch (error) {
      this._logger.error(`Error getting all interviews: ${error.message}`);
      throw new HttpException(
        `Failed to get all interviews: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':interview_id/time')
  async updateRemainingTime(
    @Param('interview_id') id: string,
    @Body() body: { remainingTime: number },
    @Request() req,
  ): Promise<{ success: boolean }> {
    try {
      const isAdmin = req.user.role === 'admin';
      await this._interviewService.updateRemainingTime(
        id,
        body.remainingTime,
        req.user.id,
        isAdmin,
      );
      return { success: true };
    } catch (error) {
      this._logger.error(`Error updating remaining time: ${error.message}`);
      throw new HttpException(
        `Failed to update remaining time: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':interview_id/time-running-out')
  async handleTimeRunningOut(
    @Param('interview_id') id: string,
    @Request() req,
  ): Promise<{ content: string; timestamp: string }> {
    try {
      const isAdmin = req.user.role === 'admin';
      const result = await this._interviewService.handleTimeRunningOut(id, req.user.id, isAdmin);
      return {
        content: result.content,
        timestamp: result.timestamp.toISOString(),
      };
    } catch (error) {
      this._logger.error(`Error handling time running out: ${error.message}`);
      throw new HttpException(
        `Failed to handle time running out: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
