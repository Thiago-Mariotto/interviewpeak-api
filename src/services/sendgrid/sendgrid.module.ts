import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SendgridService } from './sendgrid.service';

@Module({
  providers: [SendgridService, ConfigService],
  exports: [SendgridService],
})
export class SendgridModule { }
