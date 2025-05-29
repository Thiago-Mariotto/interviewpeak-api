import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import {
  AdminCreditActionDto,
  BatchCreditActionDto,
  BatchCreditResponseDto,
  CreditActionType,
  CreditResponseDto,
  CreditSummaryDto,
} from './dto/credit.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gerencia ações de crédito (adicionar ou remover)
   */
  async manageCreditAction(actionDto: AdminCreditActionDto): Promise<CreditResponseDto> {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: actionDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${actionDto.userId} not found`);
    }

    // Definir data de expiração se não foi fornecida
    let expiresAt: Date;
    if (actionDto.expiresAt) {
      expiresAt = new Date(actionDto.expiresAt);
    } else {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Padrão: 30 dias
    }

    if (actionDto.action === CreditActionType.ADD) {
      // Adicionar créditos
      const newCredit = await this.prisma.interviewCredit.create({
        data: {
          id: uuidv4(),
          userId: actionDto.userId,
          quantity: actionDto.quantity,
          remaining: actionDto.quantity,
          creditType: actionDto.creditType,
          duration: actionDto.duration,
          position: actionDto.position,
          company: actionDto.company,
          expiresAt,
        },
      });

      this.logger.log(
        `Added ${actionDto.quantity} credits of type ${actionDto.creditType} to user ${actionDto.userId}`,
      );
      return newCredit;
    } else if (actionDto.action === CreditActionType.REMOVE) {
      // Buscar créditos existentes
      const existingCredits = await this.prisma.interviewCredit.findMany({
        where: {
          userId: actionDto.userId,
          creditType: actionDto.creditType,
          remaining: { gt: 0 },
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: 'asc' },
      });

      if (!existingCredits.length) {
        throw new BadRequestException(
          `No active credits of type ${actionDto.creditType} found for user ${actionDto.userId}`,
        );
      }

      // Determinar quantos créditos remover
      let remainingToRemove = actionDto.quantity;
      const updatedCredits: string[] = [];

      for (const credit of existingCredits) {
        if (remainingToRemove <= 0) break;

        const toRemoveFromCredit = Math.min(credit.remaining, remainingToRemove);
        const newRemaining = credit.remaining - toRemoveFromCredit;

        await this.prisma.interviewCredit.update({
          where: { id: credit.id },
          data: { remaining: newRemaining },
        });

        updatedCredits.push(credit.id);
        remainingToRemove -= toRemoveFromCredit;
      }

      if (remainingToRemove > 0) {
        throw new BadRequestException(
          `Could not remove all ${actionDto.quantity} credits. Only removed ${actionDto.quantity - remainingToRemove}`,
        );
      }

      this.logger.log(
        `Removed ${actionDto.quantity} credits of type ${actionDto.creditType} from user ${actionDto.userId}`,
      );

      // Retornar o último crédito atualizado
      return await this.prisma.interviewCredit.findUnique({
        where: { id: updatedCredits[updatedCredits.length - 1] },
      });
    } else {
      throw new BadRequestException(`Invalid action: ${actionDto.action}`);
    }
  }

  /**
   * Processa ações de crédito em lote para múltiplos usuários
   * Útil para campanhas de marketing, promoções, compensações, etc.
   */
  async processBatchCredits(batchDto: BatchCreditActionDto): Promise<BatchCreditResponseDto> {
    if (!batchDto.users || batchDto.users.length === 0) {
      throw new BadRequestException('No users provided in batch');
    }

    // Preparar resultado
    const result: BatchCreditResponseDto = {
      successful: 0,
      failed: 0,
      totalUsers: batchDto.users.length,
      errors: [],
      processedCredits: [],
    };

    // Definir data de expiração se não foi fornecida
    let expiresAt: Date;
    if (batchDto.expiresAt) {
      expiresAt = new Date(batchDto.expiresAt);
    } else {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Padrão: 30 dias
    }

    // Processar cada usuário
    for (const userItem of batchDto.users) {
      try {
        // Buscar o usuário pelo email
        const user = await this.prisma.user.findUnique({
          where: { email: userItem.email },
        });

        if (!user) {
          if (batchDto.skipNonExistingUsers) {
            result.errors.push({
              email: userItem.email,
              reason: 'User not found, skipped',
            });
            result.failed++;
            continue;
          } else {
            throw new NotFoundException(`User with email ${userItem.email} not found`);
          }
        }

        // Criar crédito para o usuário
        const newCredit = await this.prisma.interviewCredit.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            quantity: userItem.quantity,
            remaining: userItem.quantity,
            creditType: batchDto.creditType,
            duration: batchDto.duration,
            position: batchDto.position,
            company: batchDto.company,
            expiresAt,
          },
        });

        result.successful++;
        result.processedCredits.push(newCredit);
        this.logger.log(
          `Added ${userItem.quantity} credits of type ${batchDto.creditType} to user ${user.id} (${userItem.email})`,
        );
      } catch (error) {
        result.failed++;
        result.errors.push({
          email: userItem.email,
          reason: error.message,
        });
        this.logger.error(`Failed to add credits for user ${userItem.email}: ${error.message}`);
      }
    }

    // Registrar a operação em lote
    this.logger.log(
      `Batch credit operation completed: ${result.successful} successful, ${result.failed} failed out of ${result.totalUsers} total users. Reason: ${batchDto.reason || 'Not specified'}`,
    );

    return result;
  }

  /**
   * Obtém os créditos de um usuário
   */
  async getUserCredits(userId: string): Promise<CreditResponseDto[]> {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const credits = await this.prisma.interviewCredit.findMany({
      where: { userId },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });

    return credits;
  }

  /**
   * Obtém um resumo dos créditos no sistema
   */
  async getCreditsSummary(): Promise<CreditSummaryDto> {
    const now = new Date();

    // Total de créditos emitidos
    const totalCredits = await this.prisma.interviewCredit.aggregate({
      _sum: {
        quantity: true,
      },
    });

    // Créditos ativos (não expirados e com saldo)
    const activeCredits = await this.prisma.interviewCredit.aggregate({
      where: {
        remaining: { gt: 0 },
        expiresAt: { gt: now },
      },
      _sum: {
        remaining: true,
      },
    });

    // Créditos expirados
    const expiredCredits = await this.prisma.interviewCredit.aggregate({
      where: {
        expiresAt: { lt: now },
        remaining: { gt: 0 },
      },
      _sum: {
        remaining: true,
      },
    });

    // Distribuição por tipo de crédito
    const creditsByTypeRaw = await this.prisma.interviewCredit.groupBy({
      by: ['creditType'],
      where: {
        remaining: { gt: 0 },
        expiresAt: { gt: now },
      },
      _sum: {
        remaining: true,
      },
    });

    const creditsByType: Record<string, number> = {};
    creditsByTypeRaw.forEach((item) => {
      creditsByType[item.creditType] = item._sum.remaining || 0;
    });

    return {
      totalCreditsIssued: totalCredits._sum.quantity || 0,
      activeCredits: activeCredits._sum.remaining || 0,
      expiredCredits: expiredCredits._sum.remaining || 0,
      usedCredits:
        (totalCredits._sum.quantity || 0) -
        (activeCredits._sum.remaining || 0) -
        (expiredCredits._sum.remaining || 0),
      creditsByType,
    };
  }
}
