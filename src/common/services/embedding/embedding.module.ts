import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { TokenizerService } from './tokenizer.service';
import { BM25Service } from './bm25.service';

@Module({
  providers: [EmbeddingService, TokenizerService, BM25Service],
  exports: [EmbeddingService, TokenizerService, BM25Service],
})
export class EmbeddingModule { }
