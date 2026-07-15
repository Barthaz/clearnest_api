import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/public/',
  });

  const corsOrigins = configService.get<string[]>('corsOrigins') ?? [
    'http://localhost:5173',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix(configService.get<string>('apiPrefix') ?? 'api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get<string>('apiVersion') ?? '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (configService.get<boolean>('swagger.enabled') !== false) {
    const swaggerPath = configService.get<string>('swagger.path') ?? 'api/docs';
    const config = new DocumentBuilder()
      .setTitle('ClearNest API')
      .setDescription('API panelu administracyjnego ClearNest')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document);
  }

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
}

bootstrap();
