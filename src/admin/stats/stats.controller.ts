import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';

import {
  DashboardStatsDto,
  InterviewStatsDto,
  UserStatsDto,
  RevenueStatsDto,
  ConversionStatsDto,
  StatsOverviewDto,
  DaysQueryDto,
} from './dto/stats.dto';
import { StatsService } from './stats.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class StatsController {
  private readonly logger = new Logger(StatsController.name);

  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  async getDashboardStats(): Promise<DashboardStatsDto> {
    try {
      return await this.statsService.getDashboardStats();
    } catch (error) {
      this.logger.error(`Error getting dashboard stats: ${error.message}`);
      throw new HttpException(
        `Error getting dashboard stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('interviews')
  async getInterviewStats(
    @Query(new ValidationPipe({ transform: true })) query: DaysQueryDto,
  ): Promise<InterviewStatsDto> {
    try {
      return await this.statsService.getInterviewStats(query.days);
    } catch (error) {
      this.logger.error(`Error getting interview stats: ${error.message}`);
      throw new HttpException(
        `Error getting interview stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('users')
  async getUserStats(
    @Query(new ValidationPipe({ transform: true })) query: DaysQueryDto,
  ): Promise<UserStatsDto> {
    try {
      return await this.statsService.getUserStats(query.days);
    } catch (error) {
      this.logger.error(`Error getting user stats: ${error.message}`);
      throw new HttpException(
        `Error getting user stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('revenue')
  async getRevenueStats(
    @Query(new ValidationPipe({ transform: true })) query: DaysQueryDto,
  ): Promise<RevenueStatsDto> {
    try {
      return await this.statsService.getRevenueStats(query.days);
    } catch (error) {
      this.logger.error(`Error getting revenue stats: ${error.message}`);
      throw new HttpException(
        `Error getting revenue stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversion')
  async getConversionStats(
    @Query(new ValidationPipe({ transform: true })) query: DaysQueryDto,
  ): Promise<ConversionStatsDto> {
    try {
      return await this.statsService.getConversionStats(query.days);
    } catch (error) {
      this.logger.error(`Error getting conversion stats: ${error.message}`);
      throw new HttpException(
        `Error getting conversion stats: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('overview')
  async getStatsOverview(
    @Query(new ValidationPipe({ transform: true })) query: DaysQueryDto,
  ): Promise<StatsOverviewDto> {
    try {
      return await this.statsService.getStatsOverview(query.days);
    } catch (error) {
      this.logger.error(`Error getting stats overview: ${error.message}`);
      throw new HttpException(
        `Error getting stats overview: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
