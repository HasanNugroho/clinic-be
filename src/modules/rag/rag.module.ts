import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { EmbeddingModule } from '../../common/services/embedding/embedding.modul';
import { RedisModule } from 'src/common/services/redis/redis.modul';
import { QdrantModule } from '../qdrant/qdrant.module';
import { SnippetBuilderService } from './services/snippet-builder.service';
import { DatabaseModule } from 'src/common/services/database.module';

@Module({
  imports: [DatabaseModule, EmbeddingModule, RedisModule, QdrantModule],
  controllers: [RagController],
  providers: [RagService, SnippetBuilderService],
  exports: [RagService],
})
export class RagModule {}
