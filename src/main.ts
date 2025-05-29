import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';

import { AppModule } from './app.module';

async function bootstrap() {
  // Create the app with rawBody option
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false, // Disable built-in body parser for now
  });

  // Configure Express middleware for body parsing
  app.use(
    express.json({
      verify: (req: any, res, buf) => {
        // Make raw body available on request
        if (buf && buf.length) {
          req.rawBody = buf;
        }
      },
    }),
  );

  // We need to add the URL-encoded parser as well since we disabled the built-in one
  app.use(express.urlencoded({ extended: true }));

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const isDev = process.env.NODE_ENV === 'development';
  console.log(`Running in ${isDev ? 'development' : 'production'} mode`);
  // Enable CORS
  app.enableCors({
    origin: [
      'https://main.d12x2zuoacc3i3.amplifyapp.com',
      'https://interviewpeak.com',
      'https://www.interviewpeak.com',
      'http://localhost:5173',
      isDev ? 'http://localhost:5173' : '',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    preflightContinue: false,
  });

  // Get port from environment or use default
  const port = process.env.PORT || 8000;

  await app.listen(port);
  console.log(`Application is running on ${port}/api/v1`);
}
bootstrap();
