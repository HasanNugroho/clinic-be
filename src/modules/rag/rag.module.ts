import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { EmbeddingModule } from '../../common/services/embedding/embedding.modul';
import { RedisModule } from 'src/common/services/redis/redis.modul';
import { QdrantModule } from '../qdrant/qdrant.module';
import { MessageBuilderService } from './services/message-builder.service';
import { EmbeddingTextBuilderService } from './services/embedding-text-builder.service';
import { DatabaseModule } from 'src/common/services/database.module';
import { TemporalExtractionService } from '../../common/services/temporal/temporal-extraction.service';

@Module({
  imports: [DatabaseModule, EmbeddingModule, RedisModule, QdrantModule],
  controllers: [RagController],
  providers: [
    RagService,
    MessageBuilderService,
    EmbeddingTextBuilderService,
    TemporalExtractionService,
  ],
  exports: [RagService],
})
export class RagModule {}
