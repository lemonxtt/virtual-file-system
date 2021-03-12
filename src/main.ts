import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Virtual file system API')
    .setDescription('Virtual file system API')
    .setVersion('1.0')
    .addTag('system')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = 3001
  await app.listen(port).then(() => console.log("Server is running on port " + port))
}
bootstrap();
