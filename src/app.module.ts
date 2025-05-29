import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminModule } from './admin/admin.module';
import { AudioModule } from './audio/audio.module';
import { AuthModule } from './auth/auth.module';
import { FeedbackModule } from './feedback/feedback.module';
import { InterviewModule } from './interview/interview.module';
import { IpModule } from './ip/ip.module';
import { PrismaModule } from './prisma/prisma.module';
import { OpenAIModule } from './services/openai/openai.module';
import { StripeModule } from './services/stripe/stripe.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Core modules
    PrismaModule,
    OpenAIModule,
    // Feature modules
    InterviewModule,
    AudioModule,
    FeedbackModule,
    UserModule,
    AuthModule,
    StripeModule,
    IpModule,
    AdminModule,
  ],
})
export class AppModule { }
