import {
  Controller,
  Get,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';

import { SystemStatusResponseDto, TransactionDto } from './dto/system.dto';
import { SystemService } from './system.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('admin/system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSystemController {
  private readonly logger = new Logger(AdminSystemController.name);

  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  async getSystemStatus(): Promise<SystemStatusResponseDto> {
    try {
      return await this.systemService.getSystemStatus();
    } catch (error) {
      this.logger.error(`Error getting system status: ${error.message}`);
      throw new HttpException(
        `Error getting system status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/transactions/latest')
  async getLatestTransactions(@Query('limit') limit: number = 5): Promise<TransactionDto[]> {
    try {
      return await this.systemService.getLatestTransactions(limit);
    } catch (error) {
      this.logger.error(`Error getting latest transactions: ${error.message}`);
      throw new HttpException(
        `Error getting latest transactions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
