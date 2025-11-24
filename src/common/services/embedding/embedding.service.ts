import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

@Injectable()
export class EmbeddingService {
    private readonly logger = new Logger(EmbeddingService.name);
    private openai: OpenAI;
    private readonly model = 'text-embedding-3-small'; // 1536 dimensions, $0.02/1M tokens
    private readonly maxTokens = 8000; // Safe limit for embedding input

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