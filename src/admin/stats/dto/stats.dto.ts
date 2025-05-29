import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class DaysQueryDto {
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  @Transform(({ value }) => {
    const parsedValue = parseInt(value, 10);
    return isNaN(parsedValue) ? 30 : parsedValue;
  })
  days?: number = 30;
}
export interface DashboardStatsDto {
  totalUsers: number;
  totalInterviews: number;
  totalCompletedInterviews: number;
  totalRevenue: number;
  activeUsers: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  creditsUsed: number;
  creditsRemaining: number;
}

export interface InterviewStatsDto {
  totalInterviews: number;
  completedInterviews: number;
  avgDuration: number;
  interviewsByType: Record<string, number>;
  interviewsByDay: Array<{ date: string; count: number }>;
}

export interface UserStatsDto {
  totalUsers: number;
  newUsers: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  activeUsers: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  usersByDay: Array<{ date: string; count: number }>;
}

export interface RevenueStatsDto {
  totalRevenue: number;
  revenueByProduct: Record<string, number>;
  revenueByDay: Array<{ date: string; amount: number }>;
}

export interface ConversionStatsDto {
  visitorToSignupRate: number;
  signupToFirstInterviewRate: number;
  firstInterviewToSecondRate: number;
  trialToPaidRate: number;
  conversionByChannel: Record<string, number>;
}

export interface TimeSeriesDataDto {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
}

export interface StatsOverviewDto {
  kpis: {
    totalRevenue: number;
    totalUsers: number;
    totalInterviews: number;
    activeUsers: number;
  };
  revenueChart: TimeSeriesDataDto;
  usersChart: TimeSeriesDataDto;
  interviewsChart: TimeSeriesDataDto;
}
