import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface QdrantPoint {
    id: string;
    vector: number[];
    payload: Record<string, any>;
}

export class QdrantSearchResponse {
    id: string;
    score: number;
    payload: any;
}

@Injectable()
export class QdrantService {
    private readonly logger = new Logger(QdrantService.name);
    private client: QdrantClient;
    private readonly vectorSize = 1536; // OpenAI text-embedding-3-small dimension

    constructor(private configService: ConfigService) {
        const qdrantUrl = this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
        // const qdrantApiKey = this.configService.get<string>('QDRANT_API_KEY');

        this.client = new QdrantClient({
            url: qdrantUrl,
        });

        this.logger.log(`✅ Qdrant client initialized at ${qdrantUrl}`);
    }

    /**
     * Create or recreate a collection
     */
    async createCollection(collectionName: string): Promise<void> {
        try {
            // Check if collection exists
            const collections = await this.client.getCollections();
            const exists = collections.collections.some((c) => c.name === collectionName);

            if (exists) {
                this.logger.log(`Collection '${collectionName}' already exists`);
                return;
            }

            // Create new collection
            await this.client.createCollection(collectionName, {
                vectors: {
                    size: this.vectorSize,
                    distance: 'Cosine',
                },
            });

            this.logger.log(`✅ Collection '${collectionName}' created successfully`);
        } catch (error) {
            this.logger.error(`Error creating collection '${collectionName}':`, error);
            throw error;
        }
    }

    /**
     * Delete a collection
     */
    async deleteCollection(collectionName: string): Promise<void> {
        try {
            await this.client.deleteCollection(collectionName);
            this.logger.log(`✅ Collection '${collectionName}' deleted successfully`);
        } catch (error) {
            this.logger.error(`Error deleting collection '${collectionName}':`, error);
            throw error;
        }
    }

    /**
     * Upsert a single point (document) into a collection
     */
    async index(
        collectionName: string,
        id: string,
        vector: number[],
        payload: Record<string, any>,
    ): Promise<void> {
        try {
            await this.client.upsert(collectionName, {
                points: [
                    {
                        id: this.stringToId(id),
                        vector,
                        payload,
                    },
                ],
            });

            this.logger.debug(`✅ Point '${id}' upserted to '${collectionName}'`);
        } catch (error) {
            this.logger.error(`Error upserting point '${id}' to '${collectionName}':`, error);
            throw error;
        }
    }

    /**
     * Upsert multiple points (documents) into a collection
     */
    async indexs(
        collectionName: string,
        points: QdrantPoint[],
    ): Promise<void> {
        try {
            const formattedPoints = points.map((p) => ({
                id: this.stringToId(p.id),
                vector: p.vector,
                payload: p.payload,
            }));

            await this.client.upsert(collectionName, {
                points: formattedPoints,
            });

            this.logger.log(`✅ ${points.length} points upserted to '${collectionName}'`);
        } catch (error) {
            this.logger.error(`Error upserting points to '${collectionName}':`, error);
            throw error;
        }
    }

    /**
     * Delete a point from a collection
     */
    async deletePoint(collectionName: string, id: string): Promise<void> {
        try {
            await this.client.delete(collectionName, {
                points: [this.stringToId(id)],
            });

            this.logger.debug(`✅ Point '${id}' deleted from '${collectionName}'`);
        } catch (error) {
            this.logger.error(`Error deleting point '${id}' from '${collectionName}':`, error);
            throw error;
        }
    }

    /**
     * Search for similar vectors in a collection with optional filtering
     * @param collectionName - Collection to search in
     * @param vector - Query vector
     * @param limit - Maximum number of results
     * @param scoreThreshold - Minimum similarity score
     * @param filter - Optional Qdrant filter for payload filtering
     */
    async search(
        collectionName: string,
        vector: number[],
        limit: number = 10,
        scoreThreshold: number = 0.5,
        filters?: Record<string, any>,
    ): Promise<QdrantSearchResponse[]> {
        try {
            const searchParams: any = {
                vector,
                limit,
                score_threshold: scoreThreshold,
                with_payload: true,
            };

            // Add filter if provided
            if (filters && Object.keys(filters).length > 0) {
                const mustConditions = Object.entries(filters).map(([key, value]) => ({
                    key,
                    match: {
                        value,
                    },
                }));
                searchParams.query_filter = {
                    must: mustConditions,
                };
            }

            const results = await this.client.search(collectionName, searchParams);

            return results.map((result) => ({
                id: result.id.toString(),
                score: result.score,
                payload: result.payload,
            }));
        } catch (error) {
            this.logger.error(`Error searching in '${collectionName}':`, error);
            throw error;
        }
    }

    /**
     * Get collection info
     */
    async getCollectionInfo(collectionName: string): Promise<any> {
        try {
            return await this.client.getCollection(collectionName);
        } catch (error) {
            this.logger.error(`Error getting collection info for '${collectionName}':`, error);
            throw error;
        }
    }

    /**
     * Convert string ID to numeric ID for Qdrant
     * Uses hash of string to generate consistent numeric ID
     */
    private stringToId(id: string): number {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            const char = id.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
}
