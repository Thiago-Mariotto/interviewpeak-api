import { Module } from '@nestjs/common';

import { AdminSystemController } from './system.controller';
import { SystemService } from './system.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminSystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
