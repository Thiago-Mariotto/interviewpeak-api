import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const logLevels = {
      debug: ['query', 'info', 'warn', 'error'],
      info: ['info', 'warn', 'error'],
      warn: ['warn', 'error'],
      error: ['error'],
      none: [],
    };

    const logLevel = (process.env.PRISMA_LOG_LEVEL || 'error') as keyof typeof logLevels;

    super({
      log: logLevels[logLevel] || ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'production') {
      const models = Reflect.ownKeys(this).filter((key) => {
        return (
          typeof key === 'string' &&
          !key.startsWith('_') &&
          ![
            '$on',
            '$connect',
            '$disconnect',
            '$use',
            '$transaction',
            '$queryRaw',
            '$executeRaw',
          ].includes(key as string)
        );
      });

      return Promise.all(
        models.map((modelKey) => {
          return this[modelKey].deleteMany();
        }),
      );
    }
  }
}
