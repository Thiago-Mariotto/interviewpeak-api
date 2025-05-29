import * as os from 'os';

import { Injectable, Logger } from '@nestjs/common';

import {
  SystemStatusResponseDto,
  SystemStatus,
  ServiceStatus,
  TransactionDto,
} from './dto/system.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private serverStartTime: Date;

  constructor(private readonly prisma: PrismaService) {
    this.serverStartTime = new Date();
  }

  /**
   * Obtém o status atual do sistema
   */
  async getSystemStatus(): Promise<SystemStatusResponseDto> {
    try {
      // Verificar status dos serviços
      const databaseStatus = await this.checkDatabaseStatus();
      const apiStatus: ServiceStatus = ServiceStatus.OPERATIONAL;
      const audioStatus = await this.checkAudioServiceStatus();

      // Verificar carga do servidor
      const cpuUsage = await this.getCpuUsage();
      const memoryUsage = this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();

      // Determinar status geral do sistema
      let systemStatus: SystemStatus;
      if (
        databaseStatus === ServiceStatus.DOWN ||
        apiStatus === (ServiceStatus.DOWN as ServiceStatus) ||
        audioStatus === ServiceStatus.DOWN ||
        cpuUsage > 90 ||
        memoryUsage > 90 ||
        diskUsage > 90
      ) {
        systemStatus = SystemStatus.CRITICAL;
      } else if (
        databaseStatus === ServiceStatus.DEGRADED ||
        apiStatus === (ServiceStatus.DEGRADED as ServiceStatus) ||
        audioStatus === ServiceStatus.DEGRADED ||
        cpuUsage > 70 ||
        memoryUsage > 70 ||
        diskUsage > 70
      ) {
        systemStatus = SystemStatus.WARNING;
      } else {
        systemStatus = SystemStatus.HEALTHY;
      }

      return {
        systemHealth: {
          status: systemStatus,
          databaseStatus,
          apiStatus,
          audioServiceStatus: audioStatus,
        },
        serverLoad: {
          cpuUsage,
          memoryUsage,
          diskUsage,
        },
        lastRestart: this.serverStartTime.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error getting system status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém as transações mais recentes
   */
  async getLatestTransactions(limit: number = 5): Promise<TransactionDto[]> {
    try {
      const transactions = await this.prisma.purchase.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true },
          },
          price: {
            include: {
              product: {
                select: { name: true },
              },
            },
          },
        },
      });

      return transactions.map((transaction) => ({
        id: transaction.id,
        userId: transaction.userId,
        userName: transaction.user.name,
        amount: transaction.amount,
        productName: transaction.price.product.name,
        status: transaction.status as 'pending' | 'completed' | 'failed',
        createdAt: transaction.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error(`Error getting latest transactions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica o status do banco de dados
   */
  private async checkDatabaseStatus(): Promise<ServiceStatus> {
    try {
      // Fazer uma consulta simples para verificar a conectividade
      await this.prisma.$queryRaw`SELECT 1`;
      return ServiceStatus.OPERATIONAL;
    } catch (error) {
      this.logger.error(`Database status check failed: ${error.message}`);
      return ServiceStatus.DOWN;
    }
  }

  /**
   * Verifica o status do serviço de áudio
   */
  private async checkAudioServiceStatus(): Promise<ServiceStatus> {
    try {
      // Verificar o status do serviço de áudio (OpenAI)
      // Simplificando para esta implementação, apenas retornamos OPERATIONAL
      // Em um cenário real, faria uma chamada para testar o serviço
      return ServiceStatus.OPERATIONAL;
    } catch (error) {
      this.logger.error(`Audio service status check failed: ${error.message}`);
      return ServiceStatus.DEGRADED;
    }
  }

  /**
   * Obtém o uso atual de CPU
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const cpus = os.cpus();
      const startMeasure = this.getCpuInfo(cpus);

      // Verificar novamente após 100ms para obter uma média de uso
      setTimeout(() => {
        const endMeasure = this.getCpuInfo(os.cpus());
        const idleDiff = endMeasure.idle - startMeasure.idle;
        const totalDiff = endMeasure.total - startMeasure.total;

        // Calcular porcentagem de uso da CPU
        const cpuUsage = 100 - Math.floor((100 * idleDiff) / totalDiff);
        resolve(cpuUsage);
      }, 100);
    });
  }

  /**
   * Obtém informações da CPU
   */
  private getCpuInfo(cpus: os.CpuInfo[]): { idle: number; total: number } {
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    }

    return { idle, total };
  }

  /**
   * Obtém o uso atual de memória
   */
  private getMemoryUsage(): number {
    const freememPercentage = (os.freemem() / os.totalmem()) * 100;
    return Math.floor(100 - freememPercentage);
  }

  /**
   * Obtém o uso atual de disco
   */
  private async getDiskUsage(): Promise<number> {
    try {
      // Simplificando para esta implementação, retornamos um valor fixo
      // Em um cenário real, usaria a biblioteca 'diskusage' ou comandos do sistema
      return 50; // 50% de uso do disco
    } catch (error) {
      this.logger.error(`Error getting disk usage: ${error.message}`);
      return 0;
    }
  }
}
