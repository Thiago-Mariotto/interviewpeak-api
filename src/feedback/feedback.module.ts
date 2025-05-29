import { Module } from '@nestjs/common';

import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { InterviewModule } from '../interview/interview.module';

@Module({
  imports: [InterviewModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
