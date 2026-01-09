import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface QdrantPoint {
  id: string | number;
  vector: {
    '': number[]; // Dense vector with empty string key
    bm25?: {
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

      // Create new collection with named hybrid vectors (dense + sparse)
      await this.client.createCollection(collectionName, {
        vectors: {
          dense: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        },
        sparse_vectors: {
          // keywords: {},
          bm25: {},
        },
      } as any);

      this.logger.log(
        `✅ Hybrid collection '${collectionName}' created successfully (dense + sparse)`,
      );
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
  async index(collectionName: string, point: QdrantPoint): Promise<void> {
    try {
      const formattedPoint = {
        id: typeof point.id === 'string' ? this.stringToId(point.id) : point.id,
        vector: {
          '': point.vector[''],
          bm25: point.vector.bm25 ?? { indices: [], values: [] },
        },
        payload: point.payload,
      };

      await this.client.upsert(collectionName, {
        points: [formattedPoint],
      });

      this.logger.debug(`✅ Hybrid point '${point.id}' upserted to '${collectionName}'`);
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
  async indexs(collectionName: string, points: QdrantPoint[]): Promise<void> {
    try {
      const formattedPoints = points.map((p) => ({
        id: typeof p.id === 'string' ? this.stringToId(p.id) : p.id,
        vector: {
          dense: p.vector['dense'] || p.vector[''], // Support both named and unnamed
          bm25: p.vector.bm25 ?? { indices: [], values: [] },
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
   * Uses Qdrant's prefetch with RRF fusion for optimized hybrid search
   * @param collectionName - Collection to search in
   * @param denseVector - Query dense vector for semantic search
   * @param sparseVector - Query sparse vector for keyword/lexical search (optional)
   * @param limit - Maximum number of results
   * @param filters - Optional Qdrant filter for payload filtering
   */
  async search(
    collectionName: string,
    denseVector: number[],
    sparseVector: { indices: number[]; values: number[] },
    limit: number = 10,
    filters?: Record<string, any>,
  ): Promise<QdrantSearchResponse[]> {
    try {
      // Validate dense vector
      if (!denseVector || denseVector.length === 0) {
        this.logger.error(`Dense vector is empty for collection '${collectionName}'`);
        throw new Error(`Dense vector cannot be empty`);
      }

      // Build filter conditions
      const queryFilter = this.buildQueryFilter(filters);

      // Perform hybrid search using prefetch with RRF fusion
      this.logger.debug(`Hybrid search (sparse + dense with RRF) in '${collectionName}'`);
      const queryParams: any = {
        prefetch: [
          {
            vector: {
              name: 'dense',
              vector: denseVector,
            },
            limit: limit * 3,
          },
          {
            sparse_vector: {
              name: 'bm25',
              vector: {
                indices: sparseVector.indices,
                values: sparseVector.values.map((v) => v * 2.5),
              },
            },
            limit: limit * 3,
          },
        ],
        query: {
          fusion: 'rrf',
        },
        limit,
        with_payload: true,
      };

      if (queryFilter) {
        queryParams.filter = queryFilter;
      }

      const queryResult = await this.client.query(collectionName, queryParams);

      const results = queryResult.points || [];
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
