/* eslint-disable @typescript-eslint/naming-convention */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-03-31.basil',
    });

    this.logger.log('Stripe client initialized');
  }

  /**
   * Cria uma sessão de checkout do Stripe
   */
  async createCheckoutSession(
    priceId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; url: string }> {
    try {
      // Buscar o preço no banco de dados
      const price = await this.prisma.price.findUnique({
        where: { id: priceId },
        include: { product: true },
      });

      if (!price || !price.stripeId) {
        throw new Error(`Price with ID ${priceId} not found or has no Stripe ID`);
      }

      // Criar a sessão de checkout
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.stripeId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        allow_promotion_codes: true,
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          priceId,
          productId: price.productId,
          quantity: price.quantity,
        },
      });

      // Criar registro de compra no banco de dados
      await this.prisma.purchase.create({
        data: {
          userId,
          priceId,
          amount: price.amount,
          status: 'pending',
          stripeSessionId: session.id,
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      this.logger.error(`Error creating checkout session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Processa um evento de webhook do Stripe
   */
  /**
   * Processes a webhook event from Stripe
   */
  async handleWebhookEvent(payload: Buffer, signature: string): Promise<void> {
    try {
      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

      if (!webhookSecret) {
        throw new Error('Stripe webhook secret not found');
      }

      // Verify the signature of the event
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      this.logger.log(`Processing Stripe webhook event: ${event.type} (${event.id})`);

      // Check if the event is already processed
      const existingEvent = await this.prisma.stripeEvent.findUnique({
        where: { id: event.id },
      });

      if (existingEvent && existingEvent.processed) {
        this.logger.log(`Event ${event.id} already processed, skipping`);
        return;
      }

      // Register the event in the database
      await this.prisma.stripeEvent.upsert({
        where: { id: event.id },
        update: {},
        create: {
          id: event.id,
          type: event.type,
          data: event.data.object as any,
        },
      });

      // Process based on event type
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await this.prisma.stripeEvent.update({
        where: { id: event.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      this.logger.log(`Successfully processed webhook event: ${event.type} (${event.id})`);
    } catch (error) {
      this.logger.error(`Error handling webhook event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Processa uma sessão de checkout completada
   */
  /**
   * Processes a completed checkout session
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      this.logger.log(`Processing checkout session: ${session.id}`);

      // Check if metadata exists and contains required fields
      if (!session.metadata || !session.metadata.userId || !session.metadata.priceId) {
        this.logger.warn(
          `Checkout session ${session.id} is missing required metadata. ` +
          `Metadata received: ${JSON.stringify(session.metadata)}. ` +
          'This might be a test event or manually created session.',
        );

        // Just log it and return rather than throwing an error
        return;
      }

      const { userId, priceId } = session.metadata;

      // Check if the purchase has already been processed
      const existingPurchase = await this.prisma.purchase.findFirst({
        where: {
          stripeSessionId: session.id,
          status: 'completed',
        },
      });

      if (existingPurchase) {
        this.logger.log(`Purchase for session ${session.id} has already been processed`);
        return;
      }

      // Find the purchase or create it if it doesn't exist
      let purchase = await this.prisma.purchase.findFirst({
        where: { stripeSessionId: session.id },
        include: { price: { include: { product: true } } },
      });

      if (!purchase) {
        // Find the price
        const price = await this.prisma.price.findUnique({
          where: { id: priceId },
          include: { product: true },
        });

        if (!price) {
          this.logger.warn(`Price with ID ${priceId} not found for session ${session.id}`);
          return;
        }

        // Create the purchase record
        purchase = await this.prisma.purchase.create({
          data: {
            id: uuidv4(), // Make sure to import v4 from uuid
            userId,
            priceId,
            amount: price.amount,
            status: 'pending',
            stripeSessionId: session.id,
          },
          include: {
            price: { include: { product: true } },
          },
        });
      }

      // Update the purchase status
      await this.prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: 'completed',
          stripePaymentId: session.payment_intent as string,
        },
      });

      // Get price and product details
      const price = purchase.price;
      const product = price.product;

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + price.expiryDays);

      // Create the credit
      await this.prisma.interviewCredit.create({
        data: {
          id: uuidv4(),
          userId,
          purchaseId: purchase.id,
          quantity: price.quantity,
          remaining: price.quantity,
          creditType: this.generateCreditType(product),
          duration: product.duration,
          position: product.position,
          company: product.company,
          expiresAt,
        },
      });

      this.logger.log(`Created credits for user ${userId} from purchase ${purchase.id}`);
    } catch (error) {
      this.logger.error(`Error handling checkout session completed: ${error.message}`);
      // We'll log the error but not rethrow it to prevent the entire webhook from failing
      // This allows other events in the same request to be processed
    }
  }

  /**
   * Processa um pagamento bem-sucedido
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Atualizar compras associadas a este pagamento
      const purchases = await this.prisma.purchase.findMany({
        where: { stripePaymentId: paymentIntent.id },
      });

      for (const purchase of purchases) {
        if (purchase.status !== 'completed') {
          await this.prisma.purchase.update({
            where: { id: purchase.id },
            data: { status: 'completed' },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error handling payment intent succeeded: ${error.message}`);
      throw error;
    }
  }

  /**
   * Processa um pagamento falho
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Atualizar compras associadas a este pagamento
      const purchases = await this.prisma.purchase.findMany({
        where: { stripePaymentId: paymentIntent.id },
      });

      for (const purchase of purchases) {
        await this.prisma.purchase.update({
          where: { id: purchase.id },
          data: { status: 'failed' },
        });
      }
    } catch (error) {
      this.logger.error(`Error handling payment intent failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera um tipo de crédito com base no produto
   */
  private generateCreditType(product: any): string {
    const { productType, duration } = product;

    if (productType === 'basic_interview') {
      return `basic_${duration}min`;
    } else if (productType === 'specialized') {
      return 'specialized';
    }

    return 'unknown';
  }

  /**
   * Sincroniza um produto com o Stripe
   */
  async syncProductWithStripe(productId: string): Promise<string> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Criar ou atualizar o produto no Stripe
      let stripeProduct;

      // Se já existe um produto no Stripe, atualizar
      if (product['stripeId']) {
        stripeProduct = await this.stripe.products.update(product['stripeId'], {
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: {
            productType: product.productType,
            position: product.position,
            company: product.company,
            duration: product.duration?.toString(),
          },
        });
      } else {
        // Criar novo produto no Stripe
        stripeProduct = await this.stripe.products.create({
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: {
            productType: product.productType,
            position: product.position,
            company: product.company,
            duration: product.duration?.toString(),
          },
        });

        // Atualizar o ID do Stripe no banco de dados
        await this.prisma.product.update({
          where: { id: productId },
          data: { stripeId: stripeProduct.id },
        });
      }

      return stripeProduct.id;
    } catch (error) {
      this.logger.error(`Error syncing product with Stripe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincroniza um preço com o Stripe
   */
  async syncPriceWithStripe(priceId: string): Promise<string> {
    try {
      const price = await this.prisma.price.findUnique({
        where: { id: priceId },
        include: { product: true },
      });

      if (!price) {
        throw new Error(`Price with ID ${priceId} not found`);
      }

      // Garantir que o produto esteja sincronizado com o Stripe
      const stripeProductId = await this.syncProductWithStripe(price.productId);

      // Criar preço no Stripe (não podemos atualizar preços no Stripe, apenas criar novos)
      if (!price.stripeId) {
        const stripePrice = await this.stripe.prices.create({
          product: stripeProductId,
          unit_amount: price.amount,
          currency: price.currency.toLowerCase(),
          metadata: {
            priceId: price.id,
            quantity: price.quantity.toString(),
            expiryDays: price.expiryDays.toString(),
          },
        });

        // Atualizar o ID do Stripe no banco de dados
        await this.prisma.price.update({
          where: { id: priceId },
          data: { stripeId: stripePrice.id },
        });

        return stripePrice.id;
      }

      return price.stripeId;
    } catch (error) {
      this.logger.error(`Error syncing price with Stripe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca uma sessão de checkout
   */
  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      this.logger.error(`Error retrieving checkout session: ${error.message}`);
      throw error;
    }
  }
}
