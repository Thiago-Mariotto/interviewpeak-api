import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IpService {
  private readonly logger = new Logger(IpService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica se um IP já foi usado para registrar uma conta
   * @param ip Endereço IP para verificar
   * @returns true se o IP já foi usado, false caso contrário
   */
  async isIpRegistered(ip: string): Promise<boolean> {
    try {
      const count = await this.prisma.ipRegistry.count({
        where: { ip },
      });

      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking IP registration: ${error.message}`);
      return false;
    }
  }

  /**
   * Registra um IP usado para criação de conta
   * @param ip Endereço IP para registrar
   * @param userId ID do usuário criado
   */
  async registerIp(ip: string, userId: string): Promise<void> {
    try {
      await this.prisma.ipRegistry.create({
        data: {
          id: uuidv4(),
          ip,
          userId,
        },
      });

      this.logger.log(`IP ${ip} registered for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error registering IP: ${error.message}`);
    }
  }
}
