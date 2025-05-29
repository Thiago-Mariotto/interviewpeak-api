import { Module } from '@nestjs/common';

import { AdminInterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { FeedbackModule } from '../../feedback/feedback.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, FeedbackModule],
  controllers: [AdminInterviewController],
  providers: [InterviewService],
  exports: [InterviewService],
})
export class AdminInterviewModule {}
