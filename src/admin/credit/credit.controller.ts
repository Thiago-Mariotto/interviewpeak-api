import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Param,
} from '@nestjs/common';

import { CreditService } from './credit.service';
import {
  AdminCreditActionDto,
  BatchCreditActionDto,
  BatchCreditResponseDto,
  CreditResponseDto,
  CreditSummaryDto,
} from './dto/credit.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('admin/credits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CreditController {
  private readonly logger = new Logger(CreditController.name);

  constructor(private readonly creditService: CreditService) {}

  @Post()
  async manageCreditAction(@Body() actionDto: AdminCreditActionDto): Promise<CreditResponseDto> {
    try {
      return await this.creditService.manageCreditAction(actionDto);
    } catch (error) {
      this.logger.error(`Error managing credits: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      if (error.name === 'BadRequestException') {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        `Error managing credits: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('batch')
  async batchCreditAction(@Body() batchDto: BatchCreditActionDto): Promise<BatchCreditResponseDto> {
    try {
      return await this.creditService.processBatchCredits(batchDto);
    } catch (error) {
      this.logger.error(`Error processing batch credits: ${error.message}`);

      if (error.name === 'BadRequestException') {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        `Error processing batch credits: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('summary')
  async getCreditsSummary(): Promise<CreditSummaryDto> {
    try {
      return await this.creditService.getCreditsSummary();
    } catch (error) {
      this.logger.error(`Error getting credits summary: ${error.message}`);
      throw new HttpException(
        `Error getting credits summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  async getUserCredits(@Param('userId') userId: string): Promise<CreditResponseDto[]> {
    try {
      return await this.creditService.getUserCredits(userId);
    } catch (error) {
      this.logger.error(`Error getting user credits: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error getting user credits: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
