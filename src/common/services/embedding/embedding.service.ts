import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { bm25QueryVector, buildBM25, BM25State } from '../../../common/utils/bm25.util';

export interface SparseVector {
  indices: number[];
  values: number[];
}

export interface BM25EncoderOptions {
  dim?: number;       // hashing dimension
  k1?: number;        // BM25 k1 (optional, default TF)
  b?: number;         // not used (Qdrant handles length norm)
  seed?: number;
}


export interface HybridEmbedding {
  dense: number[];
  sparse: SparseVector;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;
  private readonly model = 'text-embedding-3-small'; // 1536 dimensions, $0.02/1M tokens
  private readonly maxTokens = 8000; // Safe limit for embedding input
  private readonly vocabularySize = 30000; // Vocabulary size for sparse vectors
  private bm25Model: BM25State | null = null; // BM25 model for sparse embeddings
  private readonly bm25Dim = 1_000_000; // hashing space
  private readonly bm25K1 = 1.2;
  private readonly bm25Seed = 0;


  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in environment variables');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns 1536-dimensional embedding vector
   */
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
      this.logger.error(`Failed to generate embedding: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate hybrid embedding (dense + sparse) for a single text
   * @param text - Text to embed
   * @returns Hybrid embedding with dense vector and sparse vector
   */
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

      // Validate dense embedding
      if (!dense || dense.length === 0) {
        this.logger.error(
          `OpenAI API returned empty dense embedding for text: ${truncatedText.substring(0, 100)}`,
        );
        throw new Error(`Dense embedding is empty from OpenAI API`);
      }

      this.logger.debug(`Generated dense embedding with ${dense.length} dimensions`);

      const sparse = this.encodeBM25(truncatedText);

      this.logger.debug(
        `Generated BM25 sparse embedding with ${sparse.indices.length} terms`,
      );

      return {
        dense,
        sparse,
      };
    } catch (error) {
      this.logger.error(`Failed to generate hybrid embedding: ${error.message}`, error.stack);
      throw error;
    }
  }

  private encodeBM25(text: string): SparseVector {
    const tokens = this.tokenize(text);
    const tf = new Map<number, number>();

    for (const token of tokens) {
      const hash =
        this.murmurhash3(token, this.bm25Seed) % this.bm25Dim;
      tf.set(hash, (tf.get(hash) ?? 0) + 1);
    }

    const indices: number[] = [];
    const values: number[] = [];

    for (const [idx, freq] of tf.entries()) {
      // BM25 TF normalization (IDF handled by Qdrant)
      const score =
        (freq * (this.bm25K1 + 1)) / (freq + this.bm25K1);

      indices.push(idx);
      values.push(score);
    }

    return { indices, values };
  }


  murmurhash3(key: string, seed = 0): number {
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

  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1); // buang noise
  }


  /**
   * Normalize text for consistent embeddings
   * @param text - Raw text
   * @returns Normalized text
   */
  normalizeText(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/[^\w\s\-.,!?]/g, '') // Remove special chars except basic punctuation
      .trim();
  }

  /**
   * Truncate text to approximate token limit
   * @param text - Text to truncate
   * @param maxChars - Maximum characters (rough approximation of tokens)
   * @returns Truncated text
   */
  truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }
    return text.substring(0, maxChars) + '...';
  }

  /**
   * Build embedding text from object fields
   * @param fields - Object with field values
   * @param separator - Separator between fields
   * @returns Concatenated text
   */
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
