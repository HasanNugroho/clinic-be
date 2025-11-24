import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueuesService } from './queues.service';
import { QueuesController } from './queues.controller';
import { QueuesProcessor } from './queues.processor';
import { WebSocketGateway } from './websocket/queue.gateway';
import { DatabaseModule } from 'src/common/services/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'checkup-queue',
    }),
  ],
  controllers: [QueuesController],
  providers: [QueuesService, QueuesProcessor, WebSocketGateway],
  exports: [QueuesService],
})
export class QueuesModule { }
