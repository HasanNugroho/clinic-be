import { Module } from '@nestjs/common';
import { QdrantController } from './qdrant.controller';
import { QdrantIndexingService } from 'src/modules/qdrant/qdrant-indexing.service';
import { EmbeddingModule } from 'src/common/services/embedding/embedding.modul';
import { DatabaseModule } from 'src/common/services/database.module';
import { QdrantService } from './qdrant.service';

@Module({
    imports: [
        DatabaseModule,
        EmbeddingModule,
    ],
    controllers: [QdrantController],
    providers: [QdrantIndexingService, QdrantService],
    exports: [QdrantIndexingService, QdrantService],
})
export class QdrantModule { }
