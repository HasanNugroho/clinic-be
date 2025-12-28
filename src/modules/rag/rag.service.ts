import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Registration } from '../registrations/schemas/registration.schema';
import { Examination } from '../examinations/schemas/examination.schema';
import { DoctorSchedule } from '../doctorSchedules/schemas/doctor-schedule.schema';
import { Dashboard } from '../dashboard/schemas/dashboard.schema';
import { ClinicInfo } from '../clinic-info/schemas/clinic-info.schema';
import { EmbeddingService } from '../../common/services/embedding/embedding.service';
import { RedisService } from '../../common/services/redis/redis.service';
import { UserRole } from '../users/schemas/user.schema';
import { UserContext } from '../users/interfaces/user.interface';
import { randomUUID } from 'crypto';
import { AiAssistantResponse, RagQueryDto, RetrievalResult } from './rag.dto';
import OpenAI from 'openai';
import { QdrantService } from '../qdrant/qdrant.service';
import { MessageBuilderService } from './services/message-builder.service';
import { EmbeddingTextBuilderService } from './services/embedding-text-builder.service';
import { convertObjectIdsToStrings } from 'src/common/utils/transform-objectid.util';
import {
  TemporalExtractionService,
  TemporalInfo,
} from '../../common/services/temporal/temporal-extraction.service';

@Injectable()
export class RagService {
  private openai: OpenAI;
  private readonly logger = new Logger(RagService.name);
  private readonly HISTORY_TTL = 86400; // 24 hours in seconds
  private readonly HISTORY_KEY_PREFIX = 'rag:conversation:';

  constructor(
    @InjectModel(Registration.name)
    private registrationModel: Model<Registration>,
    @InjectModel(Examination.name)
    private examinationModel: Model<Examination>,
    @InjectModel(DoctorSchedule.name)
    private doctorScheduleModel: Model<DoctorSchedule>,
    @InjectModel(Dashboard.name)
    private dashboardModel: Model<Dashboard>,
    @InjectModel(ClinicInfo.name)
    private clinicInfoModel: Model<ClinicInfo>,
    private embeddingService: EmbeddingService,
    private redisService: RedisService,
    private qdrantService: QdrantService,
    private messageBuilderService: MessageBuilderService,
    private temporalExtractionService: TemporalExtractionService,
    private embeddingTextBuilderService: EmbeddingTextBuilderService,
  ) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  private buildTopicKey(sessionId: string): string {
    return `ai:assistant:topic:${sessionId}`;
  }

  /**
   * Load conversation history from Redis
   * @param sessionId - Unique session identifier
   * @returns Array of conversation messages
   */
  private async loadHistory(
    sessionId: string,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const key = `${this.HISTORY_KEY_PREFIX}${sessionId}`;
      const history = await this.redisService.get(key);

      if (!history) {
        return [];
      }

      this.logger.debug(`Loaded history for session ${sessionId}`, {
        messageCount: history.length,
      });

      return history;
    } catch (error) {
      this.logger.error('Failed to load conversation history', {
        error: error.message,
        stack: error.stack,
        sessionId,
      });
      return [];
    }
  }

  /**
   * Save conversation history to Redis
   * @param sessionId - Unique session identifier
   * @param history - Array of conversation messages
   */
  private async saveHistory(
    sessionId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<void> {
    try {
      const key = `${this.HISTORY_KEY_PREFIX}${sessionId}`;

      // Save with TTL (24 hours)
      await this.redisService.set(key, history, this.HISTORY_TTL);

      this.logger.debug(`Saved history for session ${sessionId}`, {
        messageCount: history.length,
        ttl: this.HISTORY_TTL,
      });
    } catch (error) {
      this.logger.error('Failed to save conversation history', {
        error: error.message,
        stack: error.stack,
        sessionId,
      });
    }
  }

  /**
   * Clear conversation history from Redis
   * @param sessionId - Unique session identifier
   */
  async clearHistory(sessionId: string): Promise<void> {
    try {
      const key = `${this.HISTORY_KEY_PREFIX}${sessionId}`;
      await this.redisService.del(key);

      this.logger.debug(`Cleared history for session ${sessionId}`);
    } catch (error) {
      this.logger.error('Failed to clear conversation history', {
        error: error.message,
        stack: error.stack,
        sessionId,
      });
    }
  }

  /**
   * Loads conversation topic from Redis
   *
   * Retrieves the stored conversation topic for context continuity.
   * Returns null if no topic found or on error.
   *
   * @param {string} sessionId - Session identifier
   * @returns {Promise<string | null>} Current conversation topic or null
   *
   * @private
   */
  private async loadTopic(sessionId: string): Promise<string> {
    try {
      const key = this.buildTopicKey(sessionId);
      const topic = await this.redisService.get(key);
      return topic || '';
    } catch (e) {
      this.logger.warn(`Failed to load topic for ${sessionId}: ${e.message}`);
      return '';
    }
  }

  /**
   * Saves conversation topic to Redis
   *
   * Stores the current conversation topic with TTL for context continuity.
   *
   * @param {string} sessionId - Session identifier
   * @param {string} topic - Current conversation topic
   * @returns {Promise<void>}
   *
   * @private
   * @note Topic is stored for 2 hours
   */
  private async saveTopic(sessionId: string, topic: string): Promise<void> {
    try {
      const key = this.buildTopicKey(sessionId);
      await this.redisService.set(key, topic, this.HISTORY_TTL);
    } catch (e) {
      this.logger.warn(`Failed to save topic for ${sessionId}: ${e.message}`);
    }
  }

  /**
   * Query RAG system with vector similarity search
   * @param query - User query string
   * @param userRole - Role of the user making the query
   * @param userId - ID of the user making the query
   * @param limit - Number of results to return
   * @returns Array of relevant documents
   */
  async query(input: RagQueryDto, userContext: UserContext): Promise<AiAssistantResponse> {
    const { query, sessionId } = input;
    const startTime = Date.now();
    const effectiveSessionId = sessionId || randomUUID();
    try {
      // 1. Check topic from Redis
      const previousTopic = await this.loadTopic(effectiveSessionId);

      console.log(previousTopic);
      // 2. Extract temporal information from query
      const temporalInfo = this.temporalExtractionService.extractTemporalInfo(query);
      this.logger.debug(`Temporal info extracted: ${JSON.stringify(temporalInfo)}`);

      // 3. Prepare query for vector search
      const searchQuery = previousTopic ? `${previousTopic} ${query}` : query;
      console.log(searchQuery);

      const retrievalResults = await this.hybridRetrieval(searchQuery, userContext, temporalInfo);

      let rankedResults = retrievalResults;
      if (!temporalInfo.hasTemporalQuery) {
        rankedResults = this.reRankResults(retrievalResults);
      }

      const history = await this.loadHistory(effectiveSessionId);
      const messages = this.messageBuilderService.buildMessages(
        query,
        rankedResults,
        userContext,
        history,
        previousTopic,
      );

      // 6. Call LLM
      const llmPayload = await this.callLLM(messages);

      // 7. Prepare response
      const response: AiAssistantResponse = {
        query,
        answer: this.sanitizeAnswer(llmPayload.answer || 'No response generated.'),
        sources: rankedResults,
        processingTimeMs: Date.now() - startTime,
        followUpQuestion: llmPayload.followUpQuestion,
        needsMoreInfo: llmPayload.needsMoreInfo,
        suggestedFollowUps: llmPayload.suggestedFollowUps,
        sessionId: effectiveSessionId,
      };

      // 8. Save topic to Redis if extracted from LLM response
      if (llmPayload.questionTopic) {
        // If topic changed or no previous topic, replace with new topic
        if (llmPayload.isTopicChanged || !previousTopic) {
          await this.saveTopic(effectiveSessionId, llmPayload.questionTopic);
        }
      }

      // 8. Persist conversation history and cache result
      const updatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...history,
        { role: 'user', content: query },
        { role: 'assistant', content: response.answer },
      ];

      await this.saveHistory(effectiveSessionId, updatedHistory);

      return response;
    } catch (error) {
      this.logger.error(`RAG query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private predictCollectionFromQuery(query: string): string[] {
    const queryLower = query.toLowerCase();
    const predictions: string[] = [];

    const collectionKeywords = {
      examinations: [
        'pemeriksaan',
        'diagnosis',
        'diagnosa',
        'hasil pemeriksaan',
        'catatan dokter',
        'status pemeriksaan',
        'diperiksa',
        'pemeriksaan medis',
      ],
      registrations: [
        'pendaftaran',
        'registrasi',
        'daftar',
        'antrian',
        'nomor antrian',
        'keluhan',
        'metode pendaftaran',
        'status pendaftaran',
      ],
      doctorschedules: [
        'jadwal',
        'jadwal dokter',
        'jadwal praktik',
        'jam praktik',
        'hari praktik',
        'kuota',
        'ketersediaan',
        'waktu praktik',
        'spesialisasi',
      ],
      dashboards: [
        'dashboard',
        'metrik',
        'statistik',
        'laporan',
        'total pasien',
        'total pendaftaran',
        'ringkasan',
        'analisis',
        'grafik',
      ],
      clinicinfos: [
        'informasi klinik',
        'jam buka',
        'jam operasional',
        'layanan',
        'fasilitas',
        'alur',
        'prosedur',
        'cara',
        'persyaratan',
        'check-in',
        'ruang tunggu',
        'apotek',
        'laboratorium',
        'imunisasi',
        'spesialis',
        'pembatalan',
        'reschedule',
      ],
    };

    for (const [collection, keywords] of Object.entries(collectionKeywords)) {
      if (keywords.some((keyword) => queryLower.includes(keyword))) {
        predictions.push(collection);
      }
    }

    return predictions.length > 0
      ? predictions
      : ['doctorschedules', 'examinations', 'registrations', 'dashboards', 'clinicinfos'];
  }

  private async hybridRetrieval(
    query: string,
    userContext: UserContext,
    temporalInfo: TemporalInfo,
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    const allCollections = [
      { name: 'doctorschedules', qdrantName: 'doctor_schedules' },
      { name: 'examinations', qdrantName: 'examinations' },
      { name: 'registrations', qdrantName: 'registrations' },
      { name: 'dashboards', qdrantName: 'dashboards' },
      { name: 'clinicinfos', qdrantName: 'clinic_info' },
    ];

    const predictedCollections = this.predictCollectionFromQuery(query);
    const collections = allCollections.filter((c) => predictedCollections.includes(c.name));

    // Generate hybrid embedding (dense + sparse) for the query
    const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(query);

    // Search Qdrant for all collections in parallel with temporal filtering
    const searches = collections.map((collection) =>
      this.searchHybrid(
        collection.name,
        collection.qdrantName,
        hybridEmbedding.dense,
        hybridEmbedding.sparse,
        userContext,
        temporalInfo,
      ),
    );

    const searchResults = await Promise.all(searches);
    searchResults.forEach((collectionResults) => results.push(...collectionResults));

    return results;
  }

  /**
   * Search Qdrant by filter first, then retrieve and map data from MongoDB
   * Flow: Search Qdrant -> Get IDs -> Retrieve from MongoDB -> Map results
   *
   * Special case: If temporalInfo.hasTemporalQuery is true, skip Qdrant and search directly from MongoDB
   * This is useful for temporal queries that require date-based sorting/filtering
   */
  private async searchHybrid(
    collection: string,
    qdrantCollection: string,
    denseVector: number[],
    sparseVector: { indices: number[]; values: number[] },
    userContext: UserContext,
    temporalInfo: TemporalInfo,
  ): Promise<RetrievalResult[]> {
    const model = this.getModelForCollection(collection);
    if (!model) return [];

    try {
      // Step 1: Get role-based filters
      const mongoFilters = this.getRoleFilters(collection, userContext);

      // Step 2: Build temporal filter based on collection type
      let temporalFilter = null;
      if (temporalInfo?.hasTemporalQuery) {
        const dateField = this.getDateFieldForCollection(collection);
        if (dateField) {
          temporalFilter = this.temporalExtractionService.buildTemporalFilter(temporalInfo);
          this.logger.debug(
            `Applied temporal filter to ${collection}: ${JSON.stringify(temporalFilter)}`,
          );
        }
      }

      // CASE 1: Database-only search for temporal queries
      if (temporalInfo.hasTemporalQuery) {
        this.logger.debug(`Using database-only search for temporal query in ${collection}`);
        return await this.searchFromDatabaseOnly(
          collection,
          model,
          mongoFilters,
          temporalFilter,
          temporalInfo,
          userContext,
        );
      }

      // CASE 2: Hybrid search (Qdrant + MongoDB)
      // Step 3: Search Qdrant with hybrid vectors (dense + sparse), role-based filters, and temporal filters
      const qdrantResults = await this.qdrantService.search(
        qdrantCollection,
        denseVector,
        sparseVector,
        25,
        0.5,
        mongoFilters,
      );

      if (!qdrantResults || qdrantResults.length === 0) {
        this.logger.debug(`No results found in Qdrant for ${qdrantCollection}`);
        return [];
      }

      // Step 4: Extract IDs from Qdrant results
      const qdrantIds = qdrantResults.map((result) => new Types.ObjectId(result.payload.id));
      const scoreMap = new Map(qdrantResults.map((r) => [r.payload.id, r.score]));
      const embeddingTextMap = new Map(
        qdrantResults.map((r) => [r.payload.id, r.payload.embeddingText]),
      );
      const dateMap = new Map(qdrantResults.map((r) => [r.payload.id, r.payload.date]));

      // Step 5: Retrieve data from MongoDB with role-based filtering
      const projection = this.getRoleProjection(collection, userContext.role);
      const filters = mongoFilters;

      const pipeline: any[] = [
        {
          $match: {
            _id: { $in: qdrantIds },
            ...filters,
          },
        },
      ];

      // Add lookups for related data
      pipeline.push(
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctor',
          },
        },
        {
          $unwind: {
            path: '$doctor',
            preserveNullAndEmptyArrays: true,
          },
        },
      );

      if (['examinations', 'registrations'].includes(collection)) {
        pipeline.push(
          {
            $lookup: {
              from: 'users',
              localField: 'patientId',
              foreignField: '_id',
              as: 'patient',
            },
          },
          {
            $unwind: {
              path: '$patient',
              preserveNullAndEmptyArrays: true,
            },
          },
        );
      }

      pipeline.push({
        $project: projection,
      });

      // Apply sorting if sortOrder is specified
      if (temporalInfo?.sortOrder) {
        const dateField = this.getDateFieldForCollection(collection);
        if (dateField) {
          const sortDirection = temporalInfo.sortOrder === 'asc' ? 1 : -1;
          pipeline.push({
            $sort: { [dateField]: sortDirection },
          });
        }
      }

      // Step 6: Execute aggregation and map results
      const mongoResults = await model.aggregate(pipeline);

      return mongoResults.map((doc) => {
        const convertedDoc = convertObjectIdsToStrings(doc);
        const docId = doc._id.toString();
        const score = scoreMap.get(docId) || 0;
        const embeddingText = embeddingTextMap.get(docId) || '';
        const date = dateMap.get(docId) || null;
        return {
          collection,
          documentId: docId,
          snippet: embeddingText,
          score,
          metadata: convertedDoc,
          date,
        };
      });
    } catch (error) {
      this.logger.error('Hybrid retrieval failed', {
        error: error.message,
        stack: error.stack,
        collection,
        qdrantCollection,
        role: userContext.role,
      });
      return [];
    }
  }

  /**
   * Search directly from MongoDB without Qdrant
   * Used for temporal queries that require date-based sorting/filtering
   */
  private async searchFromDatabaseOnly(
    collection: string,
    model: any,
    mongoFilters: any,
    temporalFilter: any,
    temporalInfo: TemporalInfo,
    userContext: UserContext,
  ): Promise<RetrievalResult[]> {
    try {
      const projection = this.getRoleProjection(collection, userContext.role);
      const dateField = this.getDateFieldForCollection(collection);

      const pipeline: any[] = [
        {
          $match: {
            ...mongoFilters,
            ...(temporalFilter || {}),
          },
        },
      ];

      // Add lookups for related data
      pipeline.push(
        {
          $lookup: {
            from: 'users',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctor',
          },
        },
        {
          $unwind: {
            path: '$doctor',
            preserveNullAndEmptyArrays: true,
          },
        },
      );

      if (['examinations', 'registrations'].includes(collection)) {
        pipeline.push(
          {
            $lookup: {
              from: 'users',
              localField: 'patientId',
              foreignField: '_id',
              as: 'patient',
            },
          },
          {
            $unwind: {
              path: '$patient',
              preserveNullAndEmptyArrays: true,
            },
          },
        );
      }

      pipeline.push({
        $project: projection,
      });

      // Apply sorting based on temporal info
      if (temporalInfo?.sortOrder && dateField) {
        const sortDirection = temporalInfo.sortOrder === 'asc' ? 1 : -1;
        pipeline.push({
          $sort: { [dateField]: sortDirection },
        });
      }

      pipeline.push({
        $limit: temporalInfo.limit || 25,
      });

      // Execute aggregation
      const mongoResults = await model.aggregate(pipeline);

      return mongoResults.map((doc) => {
        const convertedDoc = convertObjectIdsToStrings(doc);
        const docId = doc._id.toString();
        const date = dateField ? doc[dateField] : null;

        return {
          collection,
          documentId: docId,
          snippet: this.generateSnippet(doc, collection),
          score: 1.0, // Default score for database-only results
          metadata: convertedDoc,
          date,
        };
      });
    } catch (error) {
      this.logger.error('Database-only search failed', {
        error: error.message,
        stack: error.stack,
        collection,
      });
      return [];
    }
  }

  /**
   * Generate a text snippet from document data
   * Used when searching directly from database without Qdrant's embeddingText
   */
  private generateSnippet(doc: any, collection: string): string {
    return this.embeddingTextBuilderService.buildEmbeddingText(collection, doc);
  }

  private getModelForCollection(collection: string): Model<any> | null {
    const models = {
      doctorschedules: this.doctorScheduleModel,
      examinations: this.examinationModel,
      registrations: this.registrationModel,
      dashboards: this.dashboardModel,
      clinicinfos: this.clinicInfoModel,
    };
    return models[collection] || null;
  }

  private getRoleProjection(collection: string, role: UserRole): any {
    const baseProjection = {
      doctorschedules: {
        dayOfWeek: 1,
        startTime: 1,
        endTime: 1,
        quota: 1,
        'doctor.fullName': 1,
        'doctor.specialization': 1,
      },
      examinations: {
        patientId: 1,
        doctorId: 1,
        examinationDate: 1,
        diagnosisSummary: 1,
        doctorNotes: 1,
        examinationNumber: 1,
        status: 1,
        'doctor.fullName': 1,
        'doctor.specialization': 1,
        'patient.fullName': 1,
      },
      registrations: {
        patientId: 1,
        doctorId: 1,
        registrationDate: 1,
        registrationMethod: 1,
        status: 1,
        queueNumber: 1,
        'doctor.fullName': 1,
        'doctor.specialization': 1,
        'patient.fullName': 1,
      },
      dashboards: {
        date: 1,
        totalPatients: 1,
        totalRegistrations: 1,
        totalCompleted: 1,
        totalWaiting: 1,
        totalExamining: 1,
        totalCancelled: 1,
        registrationMethod: 1,
        doctorStats: 1,
      },
      clinicinfos: {
        title: 1,
        category: 1,
        content: 1,
        createdAt: 1,
      },
    };

    /** LIST FIELD YANG HARUS DI-HIDE PER ROLE */
    const fieldsToRemove: Record<UserRole, any> = {
      patient: {
        examinations: ['doctorId'],
        registrations: ['doctorId'],
        doctorschedules: [],
        dashboards: [],
        clinicinfos: [],
      },

      doctor: {
        examinations: ['patientId', "'patient.fullName'"],
        registrations: ['patientId', "'patient.fullName'"],
        doctorschedules: [],
        dashboards: [],
        clinicinfos: [],
      },

      admin: {
        examinations: ['diagnosisSummary', 'doctorNotes', 'patientId', "'patient.fullName'"],
        registrations: ['patientId', "'patient.fullName'"],
        doctorschedules: [],
        dashboards: [],
        clinicinfos: [],
      },
    };

    // Start from base projection
    const projection = { ...(baseProjection[collection] || {}) };

    // Remove forbidden fields
    const removeList = fieldsToRemove[role]?.[collection] || [];
    for (const field of removeList) {
      delete projection[field];
    }

    return projection;
  }

  private getRoleFilters(collection: string, userContext: UserContext) {
    const baseFilters: any = {};

    if (
      userContext.role === UserRole.DOCTOR &&
      ['registrations', 'examinations'].includes(collection)
    ) {
      baseFilters.doctorId = new Types.ObjectId(userContext.userId);
    }

    if (
      userContext.role === UserRole.PATIENT &&
      ['registrations', 'examinations'].includes(collection)
    ) {
      baseFilters.patientId = new Types.ObjectId(userContext.userId);
    }
    return baseFilters;
  }

  /**
   * Get the date field name for a collection to use in temporal filtering
   */
  private getDateFieldForCollection(collection: string): string | null {
    const dateFieldMap: Record<string, string | null> = {
      examinations: 'examinationDate',
      registrations: 'registrationDate',
      dashboards: 'date',
      doctorschedules: null,
      clinicinfos: 'createdAt',
    };
    return dateFieldMap[collection] || null;
  }

  private async callLLM(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): Promise<{
    answer: string;
    needsMoreInfo?: boolean;
    followUpQuestion?: string | undefined;
    suggestedFollowUps?: string[];
    questionTopic?: string;
    isTopicChanged?: boolean;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 700,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      try {
        const parsed = JSON.parse(content);
        return parsed;
      } catch (e) {
        this.logger.error('Failed to parse LLM JSON response', {
          error: e.message,
          stack: e.stack,
          content: content.substring(0, 200),
        });
        return { answer: content };
      }
    } catch (error) {
      this.logger.error('Failed to call OpenAI LLM', {
        error: error.message,
        stack: error.stack,
        model: 'gpt-4o-mini',
        messagesCount: messages.length,
      });
      throw error;
    }
  }

  // Sort by score descending
  private reRankResults(results: RetrievalResult[]): RetrievalResult[] {
    return results.sort((a, b) => b.score - a.score);
  }

  private sanitizeAnswer(answer: string): string {
    if (!answer) return answer;
    let out = answer;
    // Replace markdown links [text](url) -> text
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1');
    // Remove bare URLs
    out = out.replace(/https?:\/\/[^\s)]+/gi, '').trim();
    // Collapse extra spaces created by removals
    out = out.replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.');
    return out;
  }
}
