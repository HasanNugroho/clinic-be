import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

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
  private readonly bm25Dim = 10000;
  private readonly bm25K1 = 1.2;
  private readonly bm25Seed = 0;

  constructor(private configService: ConfigService) {
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

      // Generate BM25 dengan dynamic term extraction
      const sparse = this.encodeBM25Dynamic(truncatedText);

      this.logger.debug(
        `Hybrid embedding: dense=${dense.length}D, sparse=${sparse.indices.length} terms`,
      );

      return { dense, sparse };
    } catch (error) {
      this.logger.error(`Failed to generate hybrid embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Dynamic BM25 encoding dengan multi-gram support
   * Extracts unigrams, bigrams, dan trigrams untuk better matching
   */
  private encodeBM25Dynamic(text: string): SparseVector {
    const tokens = this.tokenize(text);
    const tf = new Map<number, { count: number; term: string }>();

    // Extract n-grams (unigrams, bigrams, trigrams)
    const ngrams = this.extractNGrams(tokens, 3);

    // Calculate term frequency dengan weight berdasarkan n-gram order
    for (const { gram, weight } of ngrams) {
      const hash = this.murmurhash3(gram, this.bm25Seed) % this.bm25Dim;
      const current = tf.get(hash);

      if (current) {
        // Collision detected - boost the score
        tf.set(hash, {
          count: current.count + weight,
          term: current.term, // Keep first term
        });
      } else {
        tf.set(hash, { count: weight, term: gram });
      }
    }

    const indices: number[] = [];
    const values: number[] = [];

    for (const [idx, { count }] of tf.entries()) {
      // BM25 TF scoring dengan saturation
      const score = (count * (this.bm25K1 + 1)) / (count + this.bm25K1);
      indices.push(idx);
      values.push(score);
    }

    // Sort by value descending untuk prioritas term penting
    const sorted = indices.map((idx, i) => ({ idx, val: values[i] })).sort((a, b) => b.val - a.val);

    return {
      indices: sorted.map((s) => s.idx),
      values: sorted.map((s) => s.val),
    };
  }

  /**
   * Extract n-grams dari token array
   * Unigrams: weight 1.0
   * Bigrams: weight 1.5 (lebih penting untuk phrase matching)
   * Trigrams: weight 2.0 (paling penting untuk specific phrase)
   */
  private extractNGrams(
    tokens: string[],
    maxN: number = 3,
  ): Array<{ gram: string; weight: number }> {
    const ngrams: Array<{ gram: string; weight: number }> = [];

    // Unigrams
    for (const token of tokens) {
      ngrams.push({ gram: token, weight: 1.0 });
    }

    // Bigrams (jika ada minimal 2 tokens)
    if (tokens.length >= 2) {
      for (let i = 0; i < tokens.length - 1; i++) {
        const bigram = `${tokens[i]}_${tokens[i + 1]}`;
        ngrams.push({ gram: bigram, weight: 1.5 });
      }
    }

    // Trigrams (jika ada minimal 3 tokens)
    if (maxN >= 3 && tokens.length >= 3) {
      for (let i = 0; i < tokens.length - 2; i++) {
        const trigram = `${tokens[i]}_${tokens[i + 1]}_${tokens[i + 2]}`;
        ngrams.push({ gram: trigram, weight: 2.0 });
      }
    }

    return ngrams;
  }

  /**
   * Improved tokenization dengan:
   * - Stopword removal yang lebih selektif
   * - Better stemming untuk medical terms
   * - Preserve important short terms
   */
  tokenize(text: string): string[] {
    // Stopwords yang benar-benar tidak penting
    const stopwords = new Set([
      'yang',
      'pada',
      'dari',
      'untuk',
      'ini',
      'adalah',
      'dengan',
      'tersedia',
      'dapat',
      'orang',
    ]);

    return text
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0 && !stopwords.has(t))
      .map((t) => this.stemDynamic(t));
  }

  /**
   * Dynamic stemming dengan medical term preservation
   */
  private stemDynamic(word: string): string {
    // Preserve medical terms
    const medicalTerms = new Set([
      'endocrinology',
      'endokrinologi',
      'orthopedics',
      'orthopedi',
      'neurology',
      'neurologi',
      'obstetrics',
      'obstetri',
      'gynecology',
      'kandungan',
      'kebidanan',
      'rheumatology',
      'reumatologi',
    ]);

    if (medicalTerms.has(word)) {
      return word;
    }

    // Remove common Indonesian affixes
    return word.replace(/^(di|ke|se|mem|men|meng|ter|ber|per)/, '').replace(/(kan|an|i|nya)$/, '');
  }

  /**
   * Murmur hash implementation
   */
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
