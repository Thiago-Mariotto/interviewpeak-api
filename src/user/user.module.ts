import { Module } from '@nestjs/common';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { IpModule } from '../ip/ip.module';
import { SendgridModule } from '../services/sendgrid/sendgrid.module';

@Module({
  imports: [IpModule, SendgridModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule { }
