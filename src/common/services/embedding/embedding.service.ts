import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

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

            // Generate sparse embedding from text
            const sparse = this.generateSparseEmbedding(truncatedText);

            return { dense, sparse };
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
     * Generate sparse embedding from text using term frequency
     * Creates a sparse vector with word indices and their frequencies
     * @param text - Text to create sparse embedding from
     * @returns Sparse vector with indices and values
     */
    private generateSparseEmbedding(text: string): SparseVector {
        // Tokenize text into words
        const tokens = text.toLowerCase().split(/\s+/).filter(token => token.length > 0);

        // Create a frequency map for tokens
        const tokenFreq = new Map<string, number>();
        for (const token of tokens) {
            tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
        }

        // Convert tokens to indices using a simple hash function
        const indices: number[] = [];
        const values: number[] = [];

        for (const [token, freq] of tokenFreq.entries()) {
            // Simple hash function to convert token to index
            const index = this.hashToken(token) % this.vocabularySize;
            indices.push(index);
            // Normalize frequency as value (TF-IDF simplified to TF)
            values.push(Math.sqrt(freq)); // Square root for smoother distribution
        }

        // Sort by indices for consistency
        const sorted = indices
            .map((idx, i) => ({ idx, val: values[i] }))
            .sort((a, b) => a.idx - b.idx);

        return {
            indices: sorted.map(s => s.idx),
            values: sorted.map(s => s.val),
        };
    }

    /**
     * Simple hash function for token to index conversion
     * @param token - Token to hash
     * @returns Hash value
     */
    private hashToken(token: string): number {
        let hash = 0;
        for (let i = 0; i < token.length; i++) {
            const char = token.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
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