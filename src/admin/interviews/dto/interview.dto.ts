/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable max-classes-per-file */
import { Transform } from 'class-transformer';
import { IsString, IsDate, IsEnum, IsOptional, IsInt } from 'class-validator';

import { InterviewType, InterviewerPersonality } from '../../../interview/dto/interview.dto';

export class AdminInterviewFilterDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(['created', 'in_progress', 'paused', 'completed'])
  status?: 'created' | 'in_progress' | 'paused' | 'completed';

  @IsOptional()
  @IsEnum(['basic', 'specialized'])
  type?: 'basic' | 'specialized';

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
}

export class AdminInterviewDetailsDto {
  id: string;
  settings: {
    interviewType: InterviewType;
    interviewerPersonality: InterviewerPersonality;
    jobTitle: string;
    companyName?: string;
    industry?: string;
    difficultyLevel: number;
    interviewDurationMinutes: number;
    candidateExperienceYears?: number;
    focusAreas?: string[];
    customInstructions?: string;
  };
  status: 'created' | 'in_progress' | 'paused' | 'completed';
  duration: number;
  startTime?: Date;
  endTime?: Date;
  pausedTimeMs?: number;
  interviewType: 'basic' | 'specialized';
  position?: string;
  company?: string;
  createdAt: Date;
  updatedAt: Date;

  userId: string;
  userName: string;
  userEmail: string;

  messages?: {
    id: string;
    role: string;
    content: string;
    timestamp: Date;
  }[];

  feedback?: {
    id: string;
    overallScore: number;
    overallComment: string;
    strengths: string[];
    areasToImprove: string[];
    feedbackItems: {
      id: string;
      category: string;
      score: number;
      comment: string;
      improvementSuggestion: string;
    }[];
  };
}

export class AdminInterviewStatsDto {
  totalInterviews: number;
  activeInterviews: number;
  completedInterviews: number;
  averageDuration: number; // em minutos
  interviewsByType: {
    basic: number;
    specialized: number;
  };
  interviewsByStatus: {
    created: number;
    in_progress: number;
    paused: number;
    completed: number;
  };
  recentInterviews: AdminInterviewDetailsDto[];
}

export class AdminInterviewListResponseDto {
  items: AdminInterviewDetailsDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
