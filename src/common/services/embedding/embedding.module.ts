import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { TokenizerService } from './tokenizer.service';

@Module({
  providers: [EmbeddingService, TokenizerService],
  exports: [EmbeddingService, TokenizerService],
})
export class EmbeddingModule {}
