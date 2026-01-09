import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { TokenizerService } from './tokenizer.service';

export interface SparseVector {
  indices: number[];
  values: number[];
}

export interface HybridEmbedding {
  dense: number[];
  sparse: SparseVector;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;
  private readonly model = 'text-embedding-3-small';
  private readonly maxTokens = 8000;

  constructor(
    private configService: ConfigService,
    private tokenizerService: TokenizerService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const normalizedText = this.normalizeText(text);
      const truncatedText = this.truncateText(normalizedText, this.maxTokens);

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: truncatedText,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  async generateHybridEmbedding(text: string): Promise<HybridEmbedding> {
    try {
      const normalizedText = this.normalizeText(text);
      const truncatedText = this.truncateText(normalizedText, this.maxTokens);

      // Generate dense embedding
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: truncatedText,
      });
      const dense = response.data[0].embedding;

      if (!dense || dense.length === 0) {
        throw new Error(`Dense embedding is empty from OpenAI API`);
      }

      // Generate BM25 sparse embedding using wink-bm25-text-search
      const sparse = this.encodeBM25(truncatedText);

      this.logger.debug(
        `Hybrid embedding: dense=${dense.length}D, sparse=${sparse.indices.length} terms`,
      );

      return { dense, sparse };
    } catch (error) {
      this.logger.error(`Failed to generate hybrid embedding: ${error.message}`);
      throw error;
    }
  }

  private encodeBM25(text: string): SparseVector {
    const tokens = this.tokenizerService.tokenize(text);

    if (tokens.length === 0) {
      return { indices: [], values: [] };
    }

    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    const indices: number[] = [];
    const values: number[] = [];

    let termIndex = 0;
    for (const [term, freq] of tf.entries()) {
      const score = (freq * (1.2 + 1)) / (freq + 1.2);
      indices.push(termIndex);
      values.push(score);
      termIndex++;
    }

    const sorted = indices.map((idx, i) => ({ idx, val: values[i] })).sort((a, b) => b.val - a.val);

    return {
      indices: sorted.map((s) => s.idx),
      values: sorted.map((s) => s.val),
    };
  }

  normalizeText(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,!?]/g, '')
      .trim();
  }

  truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }
    return text.substring(0, maxChars) + '...';
  }

  buildEmbeddingText(fields: Record<string, any>, separator = ' | '): string {
    return Object.entries(fields)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => {
        let formattedValue: string;
        if (Array.isArray(value)) {
          formattedValue = value.join(', ');
        } else if (typeof value === 'object') {
          formattedValue = JSON.stringify(value);
        } else {
          formattedValue = String(value);
        }
        return `${key}: ${formattedValue}`;
      })
      .join(separator);
  }
}
