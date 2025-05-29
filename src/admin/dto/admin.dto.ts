/* eslint-disable max-classes-per-file */
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
  IsInt,
  IsArray,
  ValidateNested,
  IsEmail,
  IsBoolean,
} from 'class-validator';

export enum CreditActionType {
  ADD = 'add',
  REMOVE = 'remove',
}

export class FindUserByEmailDto {
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class AdminCreditActionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(CreditActionType)
  action: CreditActionType;

  @IsString()
  @IsNotEmpty()
  creditType: string; // e.g., 'basic_15min', 'basic_30min', 'specialized_stage1'

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string; // ISO date string for expiration
}

export class UserCreditBatchItem {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class BatchCreditActionDto {
  @IsString()
  @IsNotEmpty()
  creditType: string; // e.g., 'basic_15min', 'basic_30min', 'specialized_stage1'

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserCreditBatchItem)
  users: UserCreditBatchItem[];

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string; // ISO date string for expiration

  @IsString()
  @IsOptional()
  reason?: string; // Reason for the batch credit action (e.g., "Marketing Campaign", "Compensation", etc.)

  @IsBoolean()
  @IsOptional()
  skipNonExistingUsers?: boolean = false;
}

export class BatchCreditResponseDto {
  successful: number;
  failed: number;
  totalUsers: number;
  errors: { email: string; reason: string }[];
  processedCredits: CreditResponseDto[];
}

export class CreditResponseDto {
  id: string;
  userId: string;
  quantity: number;
  remaining: number;
  creditType: string;
  duration?: number;
  position?: string;
  company?: string;
  createdAt: Date;
  expiresAt: Date;
}

export class DaysQueryDto {
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  days?: number = 30;
}

// Interfaces para as respostas das estatísticas

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

export interface UserInterviewDetailsDto {
  id: string;
  settings: any;
  status: string;
  duration: number;
  startTime?: Date | null;
  endTime?: Date | null;
  pausedTimeMs?: number | null;
  interviewType: string;
  position?: string | null;
  company?: string | null;
  createdAt: Date;
  updatedAt: Date;
  feedback?:
    | {
        id: string;
        overallScore: number;
        overallComment: string;
        strengths: string[];
        areasToImprove: string[];
        feedbackItems: Array<{
          id: string;
          category: string;
          score: number;
          comment: string;
          improvementSuggestion: string;
        }>;
      }
    | undefined;
  credit?:
    | {
        id: string;
        creditType: string;
        quantity: number;
        remaining: number;
        expiresAt: Date;
      }
    | undefined;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: Date;
  }>;
}

export interface RevenueStatsDto {
  totalRevenue: number;
  revenueByDay: Array<{ date: string; amount: number }>;
  revenueByProduct: Record<string, number>;
}
