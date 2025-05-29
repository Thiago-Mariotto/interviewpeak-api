/* eslint-disable max-classes-per-file */
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsArray, ValidateNested, Min, Max } from 'class-validator';

// Categorias padrão para feedback
export enum FeedbackCategory {
  CONTENT = 'content',
  CLARITY = 'clarity',
  RELEVANCE = 'relevance',
  CONFIDENCE = 'confidence',
  STRUCTURE = 'structure',
  TECHNICAL_ACCURACY = 'technical_accuracy',
}

// Categorias para feedback especializado - Backend Developer
export enum BackendDeveloperFeedbackCategory {
  ARCHITECTURE_KNOWLEDGE = 'architecture_knowledge',
  API_DESIGN = 'api_design',
  DATABASE_EXPERTISE = 'database_expertise',
  SECURITY_AWARENESS = 'security_awareness',
  SCALABILITY_UNDERSTANDING = 'scalability_understanding',
  SYSTEM_DESIGN = 'system_design',
}

export class FeedbackItemDto {
  @IsString()
  category: string; // Usamos string em vez de enum para permitir categorias de diferentes tipos

  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @IsString()
  comment: string;

  @IsString()
  improvementSuggestion: string;
}

export class InterviewFeedbackDto {
  @IsString()
  interviewId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  overallScore: number;

  @IsString()
  overallComment: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeedbackItemDto)
  feedbackItems: FeedbackItemDto[];

  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @IsArray()
  @IsString({ each: true })
  areasToImprove: string[];
}
