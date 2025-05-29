/* eslint-disable max-classes-per-file */
import { IsString, IsOptional, IsNumber, IsArray, IsEnum, Min, Max } from 'class-validator';

export enum InterviewType {
  TECHNICAL = 'technical',
  HR = 'hr',
  BEHAVIORAL = 'behavioral',
  LEADERSHIP = 'leadership',
  GENERAL = 'general',
}

export enum InterviewProductType {
  BASIC_INTERVIEW = 'basic_interview',
  SPECIALIZED = 'specialized',
}

export enum SpecializedInterviewType {
  BACKEND_DEVELOPER = 'backend_developer',
  FRONTEND_DEVELOPER = 'frontend_developer',
  FULLSTACK_DEVELOPER = 'fullstack_developer',
  MOBILE_DEVELOPER = 'mobile_developer',
  DEVOPS_ENGINEER = 'devops_engineer',
  DATA_SCIENTIST = 'data_scientist',
  UX_UI_DESIGNER = 'ux_ui_designer',
  PRODUCT_MANAGER = 'product_manager',
  QA_ENGINEER = 'qa_engineer',
  CLOUD_ARCHITECT = 'cloud_architect',
}

export enum InterviewerPersonality {
  FRIENDLY = 'friendly',
  STRICT = 'strict',
  NEUTRAL = 'neutral',
  CHALLENGING = 'challenging',
}

export enum Language {
  EN_US = 'en-us',
  PT_BR = 'pt-br',
}

export enum VoiceType {
  ALLOY = 'alloy',
  ECHO = 'echo',
  FABLE = 'fable',
  ONYX = 'onyx',
  NOVA = 'nova',
  SHIMMER = 'shimmer',
}

/**
 * Career level definitions for specialized interviews
 */
export enum CareerLevel {
  JUNIOR = 'jr',
  MID_LEVEL = 'pl',
  SENIOR = 'sr',
}

export class InterviewSettingsDto {
  @IsEnum(InterviewType)
  interviewType: InterviewType;

  @IsEnum(InterviewerPersonality)
  interviewerPersonality: InterviewerPersonality;

  @IsString()
  jobTitle: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  difficultyLevel: number;

  /**
   * Interview duration in minutes
   * For specialized interviews: 20-25 minutes recommended
   * For basic interviews: 10-20 minutes
   */
  @IsNumber()
  @Min(1)
  @Max(120)
  interviewDurationMinutes: number;

  @IsOptional()
  @IsNumber()
  candidateExperienceYears?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  /**
   * Custom instructions for the interview
   * Use this field to provide:
   * - Job description details
   * - Specific company requirements
   * - Technologies to focus on
   * - Special evaluation criteria
   * - Any other context-specific information
   */
  @IsOptional()
  @IsString()
  customInstructions?: string;

  @IsEnum(Language)
  language: Language;

  @IsOptional()
  @IsEnum(VoiceType)
  voiceType?: VoiceType;

  /**
   * Product type determines the interview approach:
   * - BASIC_INTERVIEW: General interviews with basic structure
   * - SPECIALIZED: Role-specific interviews with advanced technical focus
   */
  @IsOptional()
  @IsEnum(InterviewProductType)
  productType?: InterviewProductType;

  /**
   * Specialized interview type - only used when productType is SPECIALIZED
   * Determines the specific technical competencies to assess
   */
  @IsOptional()
  @IsEnum(SpecializedInterviewType)
  specializedType?: SpecializedInterviewType;

  /**
   * Career level affects question complexity and expectations:
   * - jr: Junior level - Focus on fundamentals and learning potential
   * - pl: Mid-level - Practical experience and independent decision making
   * - sr: Senior level - Technical leadership and architectural thinking
   */
  @IsOptional()
  @IsEnum(CareerLevel)
  careerLevel?: CareerLevel;

  // FUTURE ENHANCEMENT: Skills/Technologies array
  /**
   * Specific skills or technologies to evaluate during the interview
   * This will replace hardcoded technology lists in prompts
   * Examples: ["React", "Node.js", "PostgreSQL", "Docker", "AWS"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  /**
   * Optional skills that are nice to have but not mandatory
   * Examples: ["GraphQL", "Redis", "Kubernetes"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSkills?: string[];
}

export class MessageDto {
  @IsString()
  role: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class CreateMessageDto {
  @IsString()
  role: string;

  @IsString()
  content: string;
}

/**
 * Example of how customInstructions can be used:
 * 
 * "We are looking for a Senior Backend Developer to join our fintech team. 
 * The candidate should have experience with:
 * - Building high-performance APIs handling millions of requests
 * - Financial data processing and compliance requirements
 * - Microservices architecture with event-driven design
 * - Strong security practices for handling sensitive financial data
 * 
 * Please focus the interview on:
 * - API design for financial transactions
 * - Data consistency and transaction handling
 * - Security best practices in fintech
 * - Experience with real-time payment processing
 * - Regulatory compliance considerations"
 * 
 * This approach is much more flexible than hardcoded technology lists
 * and allows for company-specific and role-specific customization.
 */

/**
 * Future enhancement: Skills-based interview generation
 * 
 * When requiredSkills is implemented, the prompt provider can:
 * 1. Generate questions specific to those technologies
 * 2. Adjust difficulty based on career level
 * 3. Focus on practical application of those specific skills
 * 4. Create scenarios using the exact tech stack mentioned
 * 
 * Example usage:
 * requiredSkills: ["Node.js", "Express", "PostgreSQL", "Docker"]
 * preferredSkills: ["Redis", "GraphQL", "AWS Lambda"]
 * 
 * The AI would then focus questions on these specific technologies
 * while maintaining the structured interview format.
 */