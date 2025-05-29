import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

// Admin Submódulos
import { CreditModule } from './credit/credit.module';
import { AdminInterviewModule } from './interviews/interview.module';
import { ProductModule } from './product/product.module';
import { StatsModule } from './stats/stats.module';
import { SystemModule } from './system/system.module';
import { AdminUserModule } from './user/user.module';

@Module({
  imports: [
    // Módulos externos
    PrismaModule,
    UserModule,

    // Submódulos administrativos
    AdminUserModule,
    ProductModule,
    SystemModule,
    StatsModule,
    CreditModule,
    AdminInterviewModule,
  ],
  exports: [AdminUserModule, ProductModule, SystemModule, StatsModule, CreditModule],
})
export class AdminModule {}
