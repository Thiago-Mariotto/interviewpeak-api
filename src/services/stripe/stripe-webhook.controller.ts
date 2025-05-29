import {
  Controller,
  Post,
  Headers,
  Req,
  Res,
  Logger,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { StripeService } from './stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response,
  ) {
    if (!signature) {
      this.logger.error('Stripe signature missing');
      return response.status(HttpStatus.BAD_REQUEST).send('Stripe signature missing');
    }

    try {
      // Access the raw body directly
      const rawBody = request.rawBody;

      if (!rawBody) {
        throw new Error('Request body is empty or not available');
      }

      await this.stripeService.handleWebhookEvent(rawBody, signature);

      this.logger.log('Webhook processed successfully');
      response.status(HttpStatus.OK).send('Webhook processed successfully');
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      response.status(HttpStatus.BAD_REQUEST).send(`Webhook error: ${error.message}`);
    }
  }
}
