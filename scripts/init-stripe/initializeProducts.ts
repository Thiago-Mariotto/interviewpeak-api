import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import Stripe from 'stripe';

import {
  basicProducts,
  specializedProducts,
  getProductMetadata,
  generateId,
} from './productDefinitions';

dotenv.config();

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

async function createStripeProduct(
  name: string,
  description: string,
  metadata: Record<string, string>,
) {
  try {
    return await stripe.products.create({
      name,
      description,
      metadata,
    });
  } catch (error) {
    console.error(`Error creating Stripe product: ${error.message}`);
    throw error;
  }
}

async function createStripePrice(
  productId: string,
  amount: number,
  currency: string,
  metadata: Record<string, string>,
) {
  try {
    return await stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency: currency.toLowerCase(),
      metadata,
    });
  } catch (error) {
    console.error(`Error creating Stripe price: ${error.message}`);
    throw error;
  }
}

async function initializeProducts() {
  try {
    const productsCount = await prisma.product.count();
    if (productsCount > 0) {
      console.log('Products already exist in the database. Skipping initialization.');
      return;
    }

    console.log('Initializing products and prices...');

    for (const productData of basicProducts) {
      console.log(`Creating basic product: ${productData.name}`);

      const product = await prisma.product.create({
        data: {
          id: generateId(),
          name: productData.name,
          description: productData.description,
          productType: productData.type,
          duration: productData.duration,
          active: true,
        },
      });

      const metadataBase = getProductMetadata(productData);
      const metadata: Record<string, string> = {
        ...metadataBase,
        productId: product.id,
      };

      const stripeProduct = await createStripeProduct(product.name, product.description, metadata);

      await prisma.product.update({
        where: { id: product.id },
        data: { stripeId: stripeProduct.id },
      });

      for (const priceData of productData.prices) {
        const price = await prisma.price.create({
          data: {
            id: generateId(),
            productId: product.id,
            amount: priceData.amount,
            currency: 'BRL',
            quantity: priceData.quantity,
            expiryDays: priceData.expiryDays,
            active: true,
          },
        });

        const stripePrice = await createStripePrice(stripeProduct.id, priceData.amount, 'BRL', {
          priceId: price.id,
          quantity: priceData.quantity.toString(),
          expiryDays: priceData.expiryDays.toString(),
        });

        await prisma.price.update({
          where: { id: price.id },
          data: { stripeId: stripePrice.id },
        });

        console.log(
          `Created price for ${product.name}: ${priceData.quantity} for ${priceData.amount / 100} BRL`,
        );
      }
    }

    for (const productData of specializedProducts) {
      console.log(`Creating specialized product: ${productData.name}`);

      const product = await prisma.product.create({
        data: {
          id: generateId(),
          name: productData.name,
          description: productData.description,
          productType: productData.type,
          position: productData.position,
          company: productData.company,
          active: true,
        },
      });

      const metadataBase = getProductMetadata(productData);
      const metadata: Record<string, string> = {
        ...metadataBase,
        productId: product.id,
      };

      const stripeProduct = await createStripeProduct(product.name, product.description, metadata);

      await prisma.product.update({
        where: { id: product.id },
        data: { stripeId: stripeProduct.id },
      });

      for (const priceData of productData.prices) {
        const price = await prisma.price.create({
          data: {
            id: generateId(),
            productId: product.id,
            amount: priceData.amount,
            currency: 'BRL',
            quantity: priceData.quantity,
            expiryDays: priceData.expiryDays,
            active: true,
          },
        });

        const stripePrice = await createStripePrice(stripeProduct.id, priceData.amount, 'BRL', {
          priceId: price.id,
          quantity: priceData.quantity.toString(),
          expiryDays: priceData.expiryDays.toString(),
        });

        await prisma.price.update({
          where: { id: price.id },
          data: { stripeId: stripePrice.id },
        });

        console.log(
          `Created price for ${product.name}: ${priceData.quantity} for ${priceData.amount / 100} BRL`,
        );
      }
    }

    console.log('Products and prices initialization completed!');
  } catch (error) {
    console.error(`Error initializing products: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

initializeProducts()
  .then(() => console.log('Done!'))
  .catch((error) => console.error(`Script failed: ${error.message}`));
