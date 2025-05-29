// import { PrismaClient } from '@prisma/client';
// import Stripe from 'stripe';
// import { v4 as uuidv4 } from 'uuid';
// import * as dotenv from 'dotenv';

// // Carregar variáveis de ambiente
// dotenv.config();

// const prisma = new PrismaClient();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
//   apiVersion: '2025-03-31.basil',
// });

// async function createStripeProduct(name: string, description: string, metadata: any) {
//   try {
//     return await stripe.products.create({
//       name,
//       description,
//       metadata,
//     });
//   } catch (error) {
//     console.error(`Error creating Stripe product: ${error.message}`);
//     throw error;
//   }
// }

// async function createStripePrice(
//   productId: string,
//   amount: number,
//   currency: string,
//   metadata: any,
// ) {
//   try {
//     return await stripe.prices.create({
//       product: productId,
//       unit_amount: amount,
//       currency: currency.toLowerCase(),
//       metadata,
//     });
//   } catch (error) {
//     console.error(`Error creating Stripe price: ${error.message}`);
//     throw error;
//   }
// }

// async function initializeProducts() {
//   try {
//     // Verificar se já existem produtos
//     const productsCount = await prisma.product.count();
//     if (productsCount > 0) {
//       console.log('Products already exist in the database. Skipping initialization.');
//       return;
//     }

//     console.log('Initializing products and prices...');

//     // Criar produtos básicos

//     // 1. Entrevista Básica 15 min
//     const basicProduct15min = await prisma.product.create({
//       data: {
//         id: uuidv4(),
//         name: 'Entrevista Básica 15 min',
//         description: 'Simulação de entrevista básica com duração de 15 minutos',
//         productType: 'basic_interview',
//         duration: 15,
//         active: true,
//       },
//     });

//     // Criar produto no Stripe
//     const stripeProduct15min = await createStripeProduct(
//       basicProduct15min.name,
//       basicProduct15min.description,
//       {
//         productType: 'basic_interview',
//         duration: '15',
//         productId: basicProduct15min.id,
//       },
//     );

//     // Atualizar o ID do Stripe no banco de dados
//     await prisma.product.update({
//       where: { id: basicProduct15min.id },
//       data: { stripeId: stripeProduct15min.id },
//     });

//     // Criar preços para o produto de 15 min
//     const prices15min = [
//       { amount: 1990, quantity: 1, expiryDays: 30 },
//       { amount: 4990, quantity: 3, expiryDays: 30 },
//       { amount: 7990, quantity: 5, expiryDays: 45 },
//     ];

//     for (const priceData of prices15min) {
//       const price = await prisma.price.create({
//         data: {
//           id: uuidv4(),
//           productId: basicProduct15min.id,
//           amount: priceData.amount,
//           currency: 'BRL',
//           quantity: priceData.quantity,
//           expiryDays: priceData.expiryDays,
//           active: true,
//         },
//       });

//       // Criar preço no Stripe
//       const stripePrice = await createStripePrice(
//         stripeProduct15min.id,
//         priceData.amount,
//         'BRL',
//         {
//           priceId: price.id,
//           quantity: priceData.quantity.toString(),
//           expiryDays: priceData.expiryDays.toString(),
//         },
//       );

//       // Atualizar o ID do Stripe no banco de dados
//       await prisma.price.update({
//         where: { id: price.id },
//         data: { stripeId: stripePrice.id },
//       });

//       console.log(`Created price for ${basicProduct15min.name}: ${priceData.quantity} for ${priceData.amount / 100} BRL`);
//     }

//     // 2. Entrevista Básica 30 min
//     const basicProduct30min = await prisma.product.create({
//       data: {
//         id: uuidv4(),
//         name: 'Entrevista Básica 30 min',
//         description: 'Simulação de entrevista básica com duração de 30 minutos',
//         productType: 'basic_interview',
//         duration: 30,
//         active: true,
//       },
//     });

//     // Criar produto no Stripe
//     const stripeProduct30min = await createStripeProduct(
//       basicProduct30min.name,
//       basicProduct30min.description,
//       {
//         productType: 'basic_interview',
//         duration: '30',
//         productId: basicProduct30min.id,
//       },
//     );

//     // Atualizar o ID do Stripe no banco de dados
//     await prisma.product.update({
//       where: { id: basicProduct30min.id },
//       data: { stripeId: stripeProduct30min.id },
//     });

//     // Criar preços para o produto de 30 min
//     const prices30min = [
//       { amount: 2990, quantity: 1, expiryDays: 30 },
//       { amount: 7990, quantity: 3, expiryDays: 30 },
//       { amount: 12990, quantity: 5, expiryDays: 45 },
//     ];

//     for (const priceData of prices30min) {
//       const price = await prisma.price.create({
//         data: {
//           id: uuidv4(),
//           productId: basicProduct30min.id,
//           amount: priceData.amount,
//           currency: 'BRL',
//           quantity: priceData.quantity,
//           expiryDays: priceData.expiryDays,
//           active: true,
//         },
//       });

//       // Criar preço no Stripe
//       const stripePrice = await createStripePrice(
//         stripeProduct30min.id,
//         priceData.amount,
//         'BRL',
//         {
//           priceId: price.id,
//           quantity: priceData.quantity.toString(),
//           expiryDays: priceData.expiryDays.toString(),
//         },
//       );

//       // Atualizar o ID do Stripe no banco de dados
//       await prisma.price.update({
//         where: { id: price.id },
//         data: { stripeId: stripePrice.id },
//       });

//       console.log(`Created price for ${basicProduct30min.name}: ${priceData.quantity} for ${priceData.amount / 100} BRL`);
//     }

//     // 3. Entrevista Especializada
//     const specializedProduct = await prisma.product.create({
//       data: {
//         id: uuidv4(),
//         name: 'Entrevista Especializada FAANG',
//         description: 'Simulação de processo completo para empresas de tecnologia',
//         productType: 'specialized',
//         position: 'software_engineer',
//         company: 'faang',
//         active: true,
//       },
//     });

//     // Criar produto no Stripe
//     const stripeProductSpecialized = await createStripeProduct(
//       specializedProduct.name,
//       specializedProduct.description,
//       {
//         productType: 'specialized',
//         position: 'software_engineer',
//         company: 'faang',
//         productId: specializedProduct.id,
//       },
//     );

//     // Atualizar o ID do Stripe no banco de dados
//     await prisma.product.update({
//       where: { id: specializedProduct.id },
//       data: { stripeId: stripeProductSpecialized.id },
//     });

//     // Criar preços para o produto especializado
//     const pricesSpecialized = [
//       { amount: 14990, quantity: 1, expiryDays: 60 },
//       { amount: 29990, quantity: 3, expiryDays: 90 },
//     ];

//     for (const priceData of pricesSpecialized) {
//       const price = await prisma.price.create({
//         data: {
//           id: uuidv4(),
//           productId: specializedProduct.id,
//           amount: priceData.amount,
//           currency: 'BRL',
//           quantity: priceData.quantity,
//           expiryDays: priceData.expiryDays,
//           active: true,
//         },
//       });

//       // Criar preço no Stripe
//       const stripePrice = await createStripePrice(
//         stripeProductSpecialized.id,
//         priceData.amount,
//         'BRL',
//         {
//           priceId: price.id,
//           quantity: priceData.quantity.toString(),
//           expiryDays: priceData.expiryDays.toString(),
//         },
//       );

//       // Atualizar o ID do Stripe no banco de dados
//       await prisma.price.update({
//         where: { id: price.id },
//         data: { stripeId: stripePrice.id },
//       });

//       console.log(`Created price for ${specializedProduct.name}: ${priceData.quantity} for ${priceData.amount / 100} BRL`);
//     }

//     console.log('Products and prices initialization completed!');
//   } catch (error) {
//     console.error(`Error initializing products: ${error.message}`);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// // Executar a inicialização
// initializeProducts()
//   .then(() => console.log('Done!'))
//   .catch((error) => console.error(`Script failed: ${error.message}`));
