import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ProductService } from './product.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [StripeController, StripeWebhookController],
  providers: [StripeService, ProductService],
  exports: [StripeService, ProductService],
})
export class StripeModule { }
