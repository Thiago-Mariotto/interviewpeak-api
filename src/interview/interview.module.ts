import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { InterviewEngineService } from './interview-engine.service';
import { InterviewController } from './interview.controller';
import { InterviewGateway } from './interview.gateway';
import { InterviewService } from './interview.service';
import { PromptProvidersModule } from './prompt-providers/prompt-providers.module';
import { StripeModule } from '../services/stripe/stripe.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
      inject: [ConfigService],
    }),
    PromptProvidersModule,
    StripeModule,
  ],
  controllers: [InterviewController],
  providers: [InterviewService, InterviewGateway, InterviewEngineService],
  exports: [InterviewService, InterviewEngineService],
})
export class InterviewModule { }
