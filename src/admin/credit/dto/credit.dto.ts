/* eslint-disable max-classes-per-file */
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsEmail,
  IsBoolean,
} from 'class-validator';

export enum CreditActionType {
  ADD = 'add',
  REMOVE = 'remove',
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
  skipNonExistingUsers?: boolean = false; // If true, skip users that don't exist instead of failing
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

export class CreditSummaryDto {
  totalCreditsIssued: number;
  activeCredits: number;
  expiredCredits: number;
  usedCredits: number;
  creditsByType: Record<string, number>;
}
