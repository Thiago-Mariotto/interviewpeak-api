import { Module } from '@nestjs/common';

import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { InterviewModule } from '../interview/interview.module';

@Module({
  imports: [InterviewModule],
  controllers: [AudioController],
  providers: [AudioService],
  exports: [AudioService],
})
export class AudioModule {}
