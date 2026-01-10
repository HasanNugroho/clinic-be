import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { TokenizerService } from './tokenizer.service';
import { BM25Service } from './bm25.service';

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
  private readonly bm25Dim = 30000;
  private readonly bm25K1 = 1.2;
  private readonly bm25B = 0.75;
  private readonly bm25Seed = 42;

  constructor(
    private configService: ConfigService,
    private tokenizerService: TokenizerService,
    private bm25Service: BM25Service,

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

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: truncatedText,
      });
      const dense = response.data[0].embedding;

      if (!dense || dense.length === 0) {
        throw new Error(`Dense embedding is empty from OpenAI API`);
      }

      // 2️⃣ BM25 sparse embedding (external service)
      const sparse = await this.bm25Service.generateBM25(truncatedText);

      if (!sparse || !sparse.indices || !sparse.indices.length) {
        this.logger.warn(
          `BM25 sparse embedding is empty (text="${truncatedText}")`,
        );
      }

      this.logger.debug(
        `Hybrid embedding: dense=${dense.length}D, sparse=${sparse.indices.length} terms`,
      );

      return { dense, sparse };
    } catch (error) {
      this.logger.error(
        `Failed to generate hybrid embedding: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private encodeBM25(text: string): SparseVector {
    const tokens = this.tokenizerService.tokenize(text);

    if (tokens.length === 0) {
      return { indices: [], values: [] };
    }

    const tf = new Map<number, { count: number; term: string }>();

    for (const token of tokens) {
      const hash = this.murmurhash3(token, this.bm25Seed) % this.bm25Dim;
      const current = tf.get(hash);

      if (current) {
        tf.set(hash, {
          count: current.count + 1,
          term: current.term,
        });
      } else {
        tf.set(hash, { count: 1, term: token });
      }
    }

    const docLength = tokens.length;
    const avgDocLength = 80;

    const indices: number[] = [];
    const values: number[] = [];

    for (const [idx, { count }] of tf.entries()) {
      const score =
        (count * (this.bm25K1 + 1)) /
        (count + this.bm25K1 * (1 - this.bm25B + this.bm25B * (docLength / avgDocLength)));
      indices.push(idx);
      values.push(score);
    }

    const sorted = indices.map((idx, i) => ({ idx, val: values[i] })).sort((a, b) => b.val - a.val);

    return {
      indices: sorted.map((s) => s.idx),
      values: sorted.map((s) => s.val),
    };
  }

  private murmurhash3(key: string, seed = 0): number {
    let h1 = seed ^ key.length;
    let i = 0;

    while (key.length - i >= 4) {
      let k1 =
        (key.charCodeAt(i) & 0xff) |
        ((key.charCodeAt(i + 1) & 0xff) << 8) |
        ((key.charCodeAt(i + 2) & 0xff) << 16) |
        ((key.charCodeAt(i + 3) & 0xff) << 24);

      k1 = Math.imul(k1, 0xcc9e2d51);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, 0x1b873593);

      h1 ^= k1;
      h1 = (h1 << 13) | (h1 >>> 19);
      h1 = Math.imul(h1, 5) + 0xe6546b64;

      i += 4;
    }

    let k1 = 0;
    switch (key.length & 3) {
      case 3:
        k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
      case 2:
        k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
      case 1:
        k1 ^= key.charCodeAt(i) & 0xff;
        k1 = Math.imul(k1, 0xcc9e2d51);
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = Math.imul(k1, 0x1b873593);
        h1 ^= k1;
    }

    h1 ^= key.length;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
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
