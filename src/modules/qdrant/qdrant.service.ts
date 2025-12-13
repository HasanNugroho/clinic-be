import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface QdrantPoint {
    id: string;
    vector: {
        dense: number[];
        sparse?: {
            indices: number[];
            values: number[];
        };
    };
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
     * Create or recreate a collection with hybrid vectors (dense + sparse)
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

            // Create new collection with hybrid vectors
            await this.client.createCollection(collectionName, {
                vectors: {
                    dense: {
                        size: this.vectorSize,
                        distance: 'Cosine',
                    },
                } as any,
                sparse_vectors: {
                    sparse: {},
                },
            } as any);

            this.logger.log(`✅ Hybrid collection '${collectionName}' created successfully (dense + sparse)`);
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
        point: QdrantPoint,
    ): Promise<void> {
        try {
            const formattedPoint = {
                ...point,
                vector: {
                    dense: point.vector.dense,
                    sparse: point.vector.sparse ?? { indices: [], values: [] },
                },
            };

            await this.client.upsert(collectionName, {
                points: [formattedPoint],
            });

            this.logger.debug(
                `✅ Hybrid point '${point.id}' upserted to '${collectionName}'`
            );
        } catch (error) {
            this.logger.error(
                `Error upserting hybrid point '${point.id}' to '${collectionName}':`,
                error,
            );
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
                vector: {
                    dense: p.vector.dense,
                    sparse: p.vector.sparse ?? { indices: [], values: [] },
                },
                payload: p.payload,
            }));

            await this.client.upsert(collectionName, {
                points: formattedPoints,
            });

            this.logger.log(`✅ ${points.length} hybrid points upserted to '${collectionName}'`);
        } catch (error) {
            this.logger.error(`Error upserting hybrid points to '${collectionName}':`, error);
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
     * Hybrid search combining dense vector search with sparse vector search using RRF
     * @param collectionName - Collection to search in
     * @param denseVector - Query dense vector for semantic search
     * @param sparseVector - Query sparse vector for keyword/lexical search
     * @param limit - Maximum number of results
     * @param scoreThreshold - Minimum similarity score
     * @param filters - Optional Qdrant filter for payload filtering
     */
    async search(
        collectionName: string,
        denseVector: number[],
        limit: number = 10,
        scoreThreshold: number = 0.5,
        filters?: Record<string, any>,
        sparseVector?: { indices: number[]; values: number[] },
    ): Promise<QdrantSearchResponse[]> {
        try {
            // Build filter conditions
            const queryFilter = this.buildQueryFilter(filters);

            // Step 1: Dense vector search (semantic similarity)
            this.logger.debug(`Dense vector search in '${collectionName}'`);
            const denseSearchParams: any = {
                vector: {
                    name: 'dense',
                    vector: denseVector,
                },
                limit: limit * 2,
                score_threshold: scoreThreshold,
                with_payload: true,
            };
            if (queryFilter) {
                denseSearchParams.query_filter = queryFilter;
            }
            const denseResults = await this.client.search(collectionName, denseSearchParams);

            console.log('denseSearchParams' + JSON.stringify(denseSearchParams, null, 2))
            console.log(JSON.stringify(denseResults, null, 2))

            // If no sparse vector provided, return dense results only
            if (!sparseVector || sparseVector.indices.length === 0) {
                return denseResults
                    .slice(0, limit)
                    .map((result) => ({
                        id: result.id.toString(),
                        score: result.score,
                        payload: result.payload,
                    }));
            }

            // Step 2: Sparse vector search (lexical/keyword matching)
            this.logger.debug(`Sparse vector search in '${collectionName}'`);
            const sparseSearchParams: any = {
                vector: {
                    name: 'sparse',
                    vector: sparseVector,
                },
                limit: limit * 2,
                with_payload: true,
            };
            if (queryFilter) {
                sparseSearchParams.query_filter = queryFilter;
            }
            const sparseResults = await this.client.search(collectionName, sparseSearchParams);

            // Step 3: Merge results using Reciprocal Rank Fusion (RRF)
            const mergedResults = this.reciprocalRankFusion(
                denseResults,
                sparseResults,
                limit,
            );

            return mergedResults;
        } catch (error) {
            this.logger.error(`Error searching in '${collectionName}':`, error);
            throw error;
        }
    }


    /**
     * Reciprocal Rank Fusion (RRF) - combines multiple ranked lists
     * Formula: RRF(d) = Σ(1 / (k + rank(d)))
     * where k is typically 60
     */
    private reciprocalRankFusion(
        denseResults: any[],
        sparseResults: any[],
        limit: number,
    ): QdrantSearchResponse[] {
        const k = 60; // RRF constant
        const scoreMap = new Map<string, { score: number; payload: any; denseRank?: number; sparseRank?: number }>();

        // Process dense results
        denseResults.forEach((result, index) => {
            const id = result.id.toString();
            const rrfScore = 1 / (k + index + 1);
            scoreMap.set(id, {
                score: rrfScore,
                payload: result.payload,
                denseRank: index,
            });
        });

        // Process sparse results
        sparseResults.forEach((result, index) => {
            const id = result.id.toString();
            const rrfScore = 1 / (k + index + 1);

            if (scoreMap.has(id)) {
                // Combine RRF scores from both searches
                const existing = scoreMap.get(id)!;
                existing.score += rrfScore;
                existing.sparseRank = index;
            } else {
                // Add new result from sparse search
                scoreMap.set(id, {
                    score: rrfScore,
                    payload: result.payload,
                    sparseRank: index,
                });
            }
        });

        // Sort by combined RRF score and return top results
        const results = Array.from(scoreMap.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((item) => ({
                id: Array.from(scoreMap.entries()).find(([_, v]) => v === item)?.[0] || '',
                score: item.score,
                payload: item.payload,
            }));

        this.logger.debug(`Hybrid search (RRF) completed: ${results.length} results`);
        return results;
    }

    /**
     * Build Qdrant query filter from MongoDB filters
     */
    private buildQueryFilter(filters?: Record<string, any>): any {
        if (!filters || Object.keys(filters).length === 0) {
            return undefined;
        }

        const mustConditions = Object.entries(filters).map(([key, value]) => ({
            key,
            match: {
                value,
            },
        }));

        return {
            must: mustConditions,
        };
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
