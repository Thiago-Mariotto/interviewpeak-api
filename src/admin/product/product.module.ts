import { Module } from '@nestjs/common';

import { AdminProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
