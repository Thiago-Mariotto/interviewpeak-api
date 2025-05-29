import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';

import {
  AdminInterviewFilterDto,
  AdminInterviewDetailsDto,
  AdminInterviewStatsDto,
  AdminInterviewListResponseDto,
} from './dto/interview.dto';
import { InterviewService } from './interview.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('admin/interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminInterviewController {
  private readonly logger = new Logger(AdminInterviewController.name);

  constructor(private readonly interviewService: InterviewService) {}

  @Get()
  async getAllInterviews(
    @Query(new ValidationPipe({ transform: true })) filter: AdminInterviewFilterDto,
  ): Promise<AdminInterviewListResponseDto> {
    try {
      return await this.interviewService.getAllInterviews(filter);
    } catch (error) {
      this.logger.error(`Error getting all interviews: ${error.message}`);
      throw new HttpException(
        `Error getting all interviews: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getInterviewStats(): Promise<AdminInterviewStatsDto> {
    try {
      return await this.interviewService.getInterviewStats();
    } catch (error) {
      this.logger.error(`Error getting interview stats: ${error.message}`);
      throw new HttpException(
        `Error getting interview stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getInterviewById(@Param('id') id: string): Promise<AdminInterviewDetailsDto> {
    try {
      return await this.interviewService.getInterviewById(id);
    } catch (error) {
      this.logger.error(`Error getting interview by ID: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error getting interview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async deleteInterview(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.interviewService.deleteInterview(id);
      return {
        success: true,
        message: `Interview with ID ${id} has been deleted`,
      };
    } catch (error) {
      this.logger.error(`Error deleting interview: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error deleting interview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/generate-feedback')
  async generateFeedback(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.interviewService.generateFeedback(id);
      return {
        success: true,
        message: `Feedback for interview with ID ${id} has been generated`,
      };
    } catch (error) {
      this.logger.error(`Error generating feedback: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      if (error.name === 'BadRequestException') {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        `Error generating feedback: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
