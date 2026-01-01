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

  private readonly HISTORY_TTL = 86400;
  private readonly HISTORY_KEY_PREFIX = 'rag:conversation:';
  private readonly TOPIC_KEY_PREFIX = 'ai:assistant:topic:';
  private readonly LAST_QUERY_KEY_PREFIX = 'rag:last_query:';
  private readonly DEFAULT_SEARCH_LIMIT = 25;
  private readonly DEFAULT_SCORE_THRESHOLD = 0.7;
  private readonly DEFAULT_DATABASE_SCORE = 1.0;
  private readonly MAX_CONTEXT_SOURCES = 25;
  private readonly MIN_RELEVANCE_SCORE = 0.5;

  private readonly COLLECTION_MAPPINGS = [
    'doctorschedules',
    'examinations',
    'registrations',
    'dashboards',
    'clinicinfos',
  ];

  private readonly COLLECTION_KEYWORDS = {
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
      'ada dokter',
      'dokter tersedia',
      'dokter praktik',
      'dokter buka',
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
      'cara daftar',
      'gimana daftar',
      'bagaimana daftar',
    ],
  };

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
      const previousTopic = await this.loadTopic(effectiveSessionId);
      const previousQuery = await this.loadLastQuery(effectiveSessionId);
      this.logger.debug(`Previous topic: ${previousTopic}, Previous query: ${previousQuery}`);

      const temporalInfo = this.temporalExtractionService.extractTemporalInfo(query);
      this.logger.debug(`Temporal info: ${JSON.stringify(temporalInfo)}`);

      const searchQuery = this.buildSearchQuery(query, previousTopic, previousQuery);
      this.logger.debug(`Search query: ${searchQuery}`);

      const retrievalResults = await this.hybridRetrieval(searchQuery, userContext, temporalInfo);
      const shouldSkipRerank = temporalInfo.hasTemporalQuery;
      const rankedResults = shouldSkipRerank
        ? retrievalResults
        : this.reRankResults(retrievalResults);

      const limitedResults = this.limitSourcesByScore(rankedResults);

      const history = await this.loadHistory(effectiveSessionId);
      const messages = this.messageBuilderService.buildMessages(
        query,
        limitedResults,
        userContext,
        history,
        previousTopic,
      );

      const llmPayload = await this.callLLM(messages);

      const response = this.buildResponse(
        query,
        llmPayload,
        rankedResults,
        effectiveSessionId,
        startTime,
      );

      await this.updateTopicIfNeeded(effectiveSessionId, llmPayload, previousTopic);
      await this.saveLastQuery(effectiveSessionId, query);
      await this.persistConversation(effectiveSessionId, query, response.answer, history);

      return response;
    } catch (error) {
      this.logger.error(`RAG query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private buildSearchQuery(query: string, previousTopic: string, previousQuery: string): string {
    if (!previousQuery) {
      return query;
    }

    const shouldUsePreviousQuery = this.shouldUsePreviousQueryContext(query, previousQuery);

    if (shouldUsePreviousQuery) {
      this.logger.debug('Using previous query for context continuity');
      return `${previousQuery} ${query}`;
    }

    return query;
  }

  private shouldUsePreviousQueryContext(query: string, previousQuery: string): boolean {
    const queryWords = query.toLowerCase().trim().split(/\s+/);
    const isShortQuery = queryWords.length <= 5;

    const hasQuestionMark = query.includes('?');

    const hasPronouns = /\b(nya|dia|mereka|itu|ini|tersebut|ada|lain)\b/i.test(query);

    return (isShortQuery && hasQuestionMark) || hasPronouns;
  }

  private buildResponse(
    query: string,
    llmPayload: any,
    rankedResults: RetrievalResult[],
    sessionId: string,
    startTime: number,
  ): AiAssistantResponse {
    const filteredSources = this.filterSourcesByDocumentIds(
      rankedResults,
      llmPayload.sourceDocumentIds,
    );

    return {
      query,
      answer: this.sanitizeAnswer(llmPayload.answer || 'No response generated.'),
      sources: filteredSources,
      processingTimeMs: Date.now() - startTime,
      followUpQuestion: llmPayload.followUpQuestion,
      needsMoreInfo: llmPayload.needsMoreInfo,
      suggestedFollowUps: llmPayload.suggestedFollowUps,
      sessionId,
    };
  }

  private filterSourcesByDocumentIds(
    results: RetrievalResult[],
    sourceDocumentIds?: string[],
  ): RetrievalResult[] {
    if (!sourceDocumentIds || sourceDocumentIds.length === 0) {
      return results;
    }

    const filteredResults = results.filter((result) =>
      sourceDocumentIds.includes(result.documentId),
    );

    if (filteredResults.length === 0) {
      this.logger.warn('No sources matched the provided sourceDocumentIds, returning all results');
      return results;
    }

    this.logger.debug(
      `Filtered sources from ${results.length} to ${filteredResults.length} based on LLM citation`,
    );
    return filteredResults;
  }

  private async updateTopicIfNeeded(
    sessionId: string,
    llmPayload: any,
    previousTopic: string,
  ): Promise<void> {
    if (llmPayload.questionTopic && (llmPayload.isTopicChanged || !previousTopic)) {
      await this.saveTopic(sessionId, llmPayload.questionTopic);
    }
  }

  private async persistConversation(
    sessionId: string,
    query: string,
    answer: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<void> {
    const updatedHistory = [
      ...history,
      { role: 'user' as const, content: query },
      { role: 'assistant' as const, content: answer },
    ];
    await this.saveHistory(sessionId, updatedHistory);
  }

  private predictCollectionFromQuery(query: string): string[] {
    const queryLower = query.toLowerCase();
    const predictions: string[] = [];

    const doctorAvailabilityPatterns = [
      /\bada dokter\b/i,
      /\bdokter (tersedia|praktik|buka|ada)\b/i,
      /\b(jadwal|jam) (dokter|praktik)\b/i,
    ];

    const hasDoctorAvailabilityQuery = doctorAvailabilityPatterns.some((pattern) =>
      pattern.test(queryLower),
    );

    for (const [collection, keywords] of Object.entries(this.COLLECTION_KEYWORDS)) {
      if (keywords.some((keyword) => queryLower.includes(keyword))) {
        predictions.push(collection);
      }
    }

    if (hasDoctorAvailabilityQuery && !predictions.includes('doctorschedules')) {
      predictions.unshift('doctorschedules');
    }

    return predictions.length > 0 ? predictions : this.getAllCollectionNames();
  }

  private getAllCollectionNames(): string[] {
    return this.COLLECTION_MAPPINGS;
  }

  private async hybridRetrieval(
    query: string,
    userContext: UserContext,
    temporalInfo: TemporalInfo,
  ): Promise<RetrievalResult[]> {
    const predictedCollections = this.predictCollectionFromQuery(query);
    const collections = this.COLLECTION_MAPPINGS.filter((c) => predictedCollections.includes(c));

    this.logger.debug(`Predicted collections for query: ${predictedCollections.join(', ')}`);

    const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(query);

    const searches = collections.map((collection) =>
      this.searchHybrid(
        collection,
        hybridEmbedding.dense,
        hybridEmbedding.sparse,
        userContext,
        temporalInfo,
      ),
    );

    const searchResults = await Promise.all(searches);
    return searchResults.flat();
  }

  private async searchHybrid(
    collection: string,
    denseVector: number[],
    sparseVector: { indices: number[]; values: number[] },
    userContext: UserContext,
    temporalInfo: TemporalInfo,
  ): Promise<RetrievalResult[]> {
    const model = this.getModelForCollection(collection);
    if (!model) return [];

    try {
      const mongoFilters = this.getRoleFilters(collection, userContext);
      const temporalFilter = this.buildTemporalFilter(collection, temporalInfo);

      const shouldUseTemporalSearch = temporalInfo.hasTemporalQuery && temporalFilter !== null;

      if (shouldUseTemporalSearch) {
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

      const qdrantResults = await this.qdrantService.search(
        collection,
        denseVector,
        sparseVector,
        this.DEFAULT_SEARCH_LIMIT,
        this.DEFAULT_SCORE_THRESHOLD,
        mongoFilters,
      );

      if (!qdrantResults?.length) {
        this.logger.debug(`No results found in Qdrant for ${collection}`);
        return [];
      }

      return await this.enrichResultsFromMongoDB(
        collection,
        model,
        qdrantResults,
        mongoFilters,
        temporalInfo,
        userContext,
      );
    } catch (error) {
      this.logger.error('Hybrid retrieval failed', {
        error: error.message,
        stack: error.stack,
        collection,
        role: userContext.role,
      });
      return [];
    }
  }

  private buildTemporalFilter(collection: string, temporalInfo: TemporalInfo): any {
    if (!temporalInfo?.hasTemporalQuery) return null;

    const dateField = this.getDateFieldForCollection(collection);
    if (!dateField) {
      this.logger.debug(`Collection ${collection} has no date field, skipping temporal filter`);
      return null;
    }

    const filter = this.temporalExtractionService.buildTemporalFilter(temporalInfo);
    this.logger.debug(`Applied temporal filter to ${collection}: ${JSON.stringify(filter)}`);
    return filter;
  }

  private async enrichResultsFromMongoDB(
    collection: string,
    model: any,
    qdrantResults: any[],
    mongoFilters: any,
    temporalInfo: TemporalInfo,
    userContext: UserContext,
  ): Promise<RetrievalResult[]> {
    const qdrantIds = qdrantResults.map((result) => new Types.ObjectId(result.payload.id));
    const scoreMap = new Map(qdrantResults.map((r) => [r.payload.id, r.score]));
    const embeddingTextMap = new Map(
      qdrantResults.map((r) => [r.payload.id, r.payload.embeddingText]),
    );
    const dateMap = new Map(qdrantResults.map((r) => [r.payload.id, r.payload.date]));

    const projection = this.getRoleProjection(collection, userContext.role);
    const pipeline = this.buildAggregationPipeline(
      collection,
      { _id: { $in: qdrantIds }, ...mongoFilters },
      projection,
      temporalInfo,
    );

    const mongoResults = await model.aggregate(pipeline);

    return mongoResults.map((doc) => ({
      collection,
      documentId: doc._id.toString(),
      snippet: embeddingTextMap.get(doc._id.toString()) || '',
      score: scoreMap.get(doc._id.toString()) || 0,
      metadata: convertObjectIdsToStrings(doc),
      date: dateMap.get(doc._id.toString()) || null,
    }));
  }

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

      const matchFilters = { ...mongoFilters, ...(temporalFilter || {}) };
      const pipeline = this.buildAggregationPipeline(
        collection,
        matchFilters,
        projection,
        temporalInfo,
      );

      pipeline.push({ $limit: temporalInfo.limit || this.DEFAULT_SEARCH_LIMIT });

      const mongoResults = await model.aggregate(pipeline);

      return mongoResults.map((doc) => ({
        collection,
        documentId: doc._id.toString(),
        snippet: this.generateSnippet(doc, collection),
        score: this.DEFAULT_DATABASE_SCORE,
        metadata: convertObjectIdsToStrings(doc),
        date: dateField ? doc[dateField] : null,
      }));
    } catch (error) {
      this.logger.error('Database-only search failed', {
        error: error.message,
        stack: error.stack,
        collection,
      });
      return [];
    }
  }

  private buildAggregationPipeline(
    collection: string,
    matchFilters: any,
    projection: any,
    temporalInfo?: TemporalInfo,
  ): any[] {
    const pipeline: any[] = [{ $match: matchFilters }];

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

    pipeline.push({ $project: projection });

    if (temporalInfo?.sortOrder) {
      const dateField = this.getDateFieldForCollection(collection);
      if (dateField) {
        const sortDirection = temporalInfo.sortOrder === 'asc' ? 1 : -1;
        pipeline.push({ $sort: { [dateField]: sortDirection } });
      }
    }

    return pipeline;
  }

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
    const baseProjection = this.getBaseProjection(collection);
    const fieldsToRemove = this.getFieldsToRemoveByRole(role, collection);

    const projection = { ...baseProjection };
    fieldsToRemove.forEach((field) => delete projection[field]);

    return projection;
  }

  private getBaseProjection(collection: string): any {
    const projections: Record<string, any> = {
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

    return projections[collection] || {};
  }

  private getFieldsToRemoveByRole(role: UserRole, collection: string): string[] {
    const fieldsToRemove: Record<UserRole, Record<string, string[]>> = {
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

    return fieldsToRemove[role]?.[collection] || [];
  }

  private getRoleFilters(collection: string, userContext: UserContext): any {
    const filters: any = {};
    const isRelevantCollection = ['registrations', 'examinations'].includes(collection);

    if (!isRelevantCollection) return filters;

    if (userContext.role === UserRole.DOCTOR) {
      filters.doctorId = new Types.ObjectId(userContext.userId);
    } else if (userContext.role === UserRole.PATIENT) {
      filters.patientId = new Types.ObjectId(userContext.userId);
    }

    return filters;
  }

  private getDateFieldForCollection(collection: string): string | null {
    const dateFields: Record<string, string> = {
      examinations: 'examinationDate',
      registrations: 'registrationDate',
      dashboards: 'date',
      clinicinfos: 'createdAt',
    };
    return dateFields[collection] || null;
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
    sourceDocumentIds?: string[];
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

  private reRankResults(results: RetrievalResult[]): RetrievalResult[] {
    return [...results].sort((a, b) => b.score - a.score);
  }

  private limitSourcesByScore(results: RetrievalResult[]): RetrievalResult[] {
    const filteredByScore = results.filter((result) => result.score >= this.MIN_RELEVANCE_SCORE);

    const limitedResults = filteredByScore.slice(0, this.MAX_CONTEXT_SOURCES);

    if (limitedResults.length < results.length) {
      this.logger.debug(
        `Limited sources from ${results.length} to ${limitedResults.length} ` +
        `(score threshold: ${this.MIN_RELEVANCE_SCORE}, max: ${this.MAX_CONTEXT_SOURCES})`,
      );
    }

    return limitedResults;
  }

  private buildTopicKey(sessionId: string): string {
    return `${this.TOPIC_KEY_PREFIX}${sessionId}`;
  }

  private async loadHistory(
    sessionId: string,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const key = `${this.HISTORY_KEY_PREFIX}${sessionId}`;
      const history = await this.redisService.get(key);

      if (!history) return [];

      this.logger.debug(`Loaded history for session ${sessionId}: ${history.length} messages`);
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

  private async saveHistory(
    sessionId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<void> {
    try {
      const key = `${this.HISTORY_KEY_PREFIX}${sessionId}`;
      await this.redisService.set(key, history, this.HISTORY_TTL);
      this.logger.debug(`Saved history for session ${sessionId}: ${history.length} messages`);
    } catch (error) {
      this.logger.error('Failed to save conversation history', {
        error: error.message,
        stack: error.stack,
        sessionId,
      });
    }
  }

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

  private async loadTopic(sessionId: string): Promise<string> {
    try {
      const key = this.buildTopicKey(sessionId);
      const topic = await this.redisService.get(key);
      return topic || '';
    } catch (error) {
      this.logger.warn(`Failed to load topic for ${sessionId}: ${error.message}`);
      return '';
    }
  }

  private async saveTopic(sessionId: string, topic: string): Promise<void> {
    try {
      const key = this.buildTopicKey(sessionId);
      await this.redisService.set(key, topic, this.HISTORY_TTL);
    } catch (error) {
      this.logger.warn(`Failed to save topic for ${sessionId}: ${error.message}`);
    }
  }

  private async loadLastQuery(sessionId: string): Promise<string> {
    try {
      const key = `${this.LAST_QUERY_KEY_PREFIX}${sessionId}`;
      const lastQuery = await this.redisService.get(key);
      return lastQuery || '';
    } catch (error) {
      this.logger.warn(`Failed to load last query for ${sessionId}: ${error.message}`);
      return '';
    }
  }

  private async saveLastQuery(sessionId: string, query: string): Promise<void> {
    try {
      const key = `${this.LAST_QUERY_KEY_PREFIX}${sessionId}`;
      await this.redisService.set(key, query, this.HISTORY_TTL);
    } catch (error) {
      this.logger.warn(`Failed to save last query for ${sessionId}: ${error.message}`);
    }
  }

  private sanitizeAnswer(answer: string): string {
    if (!answer) return answer;

    return answer
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1')
      .replace(/https?:\/\/[^\s)]+/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+\./g, '.')
      .trim();
  }
}
