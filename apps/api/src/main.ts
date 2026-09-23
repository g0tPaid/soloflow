import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });

  app.use(helmet());
  const corsOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? corsOrigins.length > 0
          ? corsOrigins
          : ['https://soloflow.practicalthings.store']
        : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('SoloFlow API')
    .setDescription('SoloFlow accounting API')    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-organization-id', in: 'header' }, 'organization')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`SoloFlow API running on port ${port}`);
  console.log(`Swagger docs at /api/docs`);
  if (process.env.NODE_ENV === 'production' && process.env.LOCAL_SINGLE_USER === 'true') {
    console.warn(
      'LOCAL_SINGLE_USER=true is ignored in production. Remove it on Railway so staff use email/password.',
    );
  }
}

bootstrap();
