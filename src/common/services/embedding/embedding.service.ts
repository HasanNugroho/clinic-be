import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { bm25QueryVector, buildBM25, BM25State } from '../../../common/utils/bm25.util';

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
  private readonly model = 'text-embedding-3-small'; // 1536 dimensions, $0.02/1M tokens
  private readonly maxTokens = 8000; // Safe limit for embedding input
  private readonly vocabularySize = 30000; // Vocabulary size for sparse vectors
  private bm25Model: BM25State | null = null; // BM25 model for sparse embeddings

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

      // // Generate sparse embedding using BM25
      // // BM25 model must be initialized via initializeBM25Corpus() during app startup
      // if (!this.bm25Model) {
      //   this.logger.warn(
      //     'BM25 model not initialized. Call initializeBM25Corpus() during app startup. Using empty sparse vector.',
      //   );
      //   return { dense, sparse: { indices: [], values: [] } };
      // }

      // const sparse = bm25QueryVector(this.bm25Model, truncatedText);

      // this.logger.debug(
      //   `Generated BM25 sparse embedding with ${sparse.indices.length} non-zero elements`,
      // );

      return {
        dense, sparse: { indices: [], values: [] }
      };
    } catch (error) {
      this.logger.error(`Failed to generate hybrid embedding: ${error.message}`, error.stack);
      throw error;
    }
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
