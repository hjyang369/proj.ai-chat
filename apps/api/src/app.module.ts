import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BffController } from './bff/bff.controller.js';
import { UpstreamService } from './bff/upstream.service.js';
import { MockService } from './bff/mock.service.js';

@Module({
  imports: [],
  controllers: [AppController, BffController],
  providers: [AppService, UpstreamService, MockService],
})
export class AppModule {}
