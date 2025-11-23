import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('checkup-queue')
export class QueuesProcessor extends WorkerHost {
  private readonly logger = new Logger(QueuesProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'queue-created':
        return this.handleQueueCreated(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleQueueCreated(data: any) {
    this.logger.log(`Queue created: ${JSON.stringify(data)}`);
    // Additional processing logic can be added here
    // For example: send notifications, update statistics, etc.
    return { processed: true };
  }
}
