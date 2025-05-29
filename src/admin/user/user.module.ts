import { Module } from '@nestjs/common';

import { AdminUserController } from './user.controller';
import { AdminUserService } from './user.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
