import { IsNumber, IsEnum, Min, Max } from 'class-validator';

export enum SystemStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum ServiceStatus {
  OPERATIONAL = 'operational',
  DEGRADED = 'degraded',
  DOWN = 'down',
}

export class SystemHealthDto {
  @IsEnum(SystemStatus)
  status: SystemStatus;

  @IsEnum(ServiceStatus)
  audioServiceStatus: ServiceStatus;

  @IsEnum(ServiceStatus)
  databaseStatus: ServiceStatus;

  @IsEnum(ServiceStatus)
  apiStatus: ServiceStatus;
}

export class ServerLoadDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  cpuUsage: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  memoryUsage: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  diskUsage: number;
}

export class SystemStatusResponseDto {
  systemHealth: SystemHealthDto;
  serverLoad: ServerLoadDto;
  lastRestart: string;
}

export class TransactionDto {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  productName: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export class CreditSummaryDto {
  totalCreditsIssued: number;
  activeCredits: number;
  expiredCredits: number;
  usedCredits: number;
  creditsByType: Record<string, number>;
}
