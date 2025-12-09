import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Registration } from '../registrations/schemas/registration.schema';
import { Examination } from '../examinations/schemas/examination.schema';
import { DayOfWeek, DoctorSchedule } from '../doctorSchedules/schemas/doctor-schedule.schema';
import { Dashboard } from '../dashboard/schemas/dashboard.schema';
import { EmbeddingService } from '../../common/services/embedding/embedding.service';
import { RedisService } from '../../common/services/redis/redis.service';
import { User, UserRole } from '../users/schemas/user.schema';
import { UserContext } from '../users/interfaces/user.interface';
import { randomUUID } from 'crypto';
import { AiAssistantResponse, RagQueryDto, RetrievalResult } from './rag.dto';
import OpenAI from 'openai';
import { QdrantSearchResponse, QdrantService } from '../qdrant/qdrant.service';

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
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Dashboard.name)
    private dashboardModel: Model<Dashboard>,
    private embeddingService: EmbeddingService,
    private redisService: RedisService,
    private qdrantService: QdrantService,
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

      // 2. Prepare query for vector search
      const searchQuery = previousTopic ? `${previousTopic} ${query}` : query;

      const retrievalResults = await this.hybridRetrieval(searchQuery, userContext);

      const rankedResults = this.reRankResults(retrievalResults);
      const history = await this.loadHistory(effectiveSessionId);
      const messages = this.buildMessages(query, rankedResults, userContext, history);

      // 6. Call LLM
      const llmPayload = await this.callLLM(messages);

      // 7. Prepare response
      const response: AiAssistantResponse = {
        query,
        answer: this.sanitizeAnswer(llmPayload.answer || 'No response generated.'),
        sources: rankedResults.slice(0, 5),
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

  private async hybridRetrieval(
    query: string,
    userContext: UserContext,
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];
    const collections = [
      { name: 'doctorschedules', qdrantName: 'doctor_schedules' },
      { name: 'examinations', qdrantName: 'examinations' },
      { name: 'registrations', qdrantName: 'registrations' },
      { name: 'dashboards', qdrantName: 'dashboards' },
    ];

    // Generate hybrid embedding (dense + sparse) for the query
    const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(query);

    // Search Qdrant for all collections in parallel
    const searches = collections.map((collection) =>
      this.searchHybrid(
        collection.name,
        collection.qdrantName,
        hybridEmbedding.dense,
        hybridEmbedding.sparse,
        query,
        userContext,
      ),
    );

    const searchResults = await Promise.all(searches);
    searchResults.forEach((collectionResults) => results.push(...collectionResults));

    return results;
  }

  /**
   * Search Qdrant by filter first, then retrieve and map data from MongoDB
   * Flow: Search Qdrant -> Get IDs -> Retrieve from MongoDB -> Map results
   */
  private async searchHybrid(
    collection: string,
    qdrantCollection: string,
    denseVector: number[],
    sparseVector: { indices: number[]; values: number[] },
    query: string,
    userContext: UserContext,
  ): Promise<RetrievalResult[]> {
    const model = this.getModelForCollection(collection);
    if (!model) return [];

    try {
      // Step 1: Get role-based filters
      const mongoFilters = this.getRoleFilters(collection, userContext);

      // Step 2: Search Qdrant with hybrid vectors (dense + sparse) and role-based filters
      const qdrantResults = await this.qdrantService.search(
        qdrantCollection,
        denseVector,
        15,
        0.5,
        mongoFilters,
        sparseVector
      );

      if (!qdrantResults || qdrantResults.length === 0) {
        this.logger.debug(`No results found in Qdrant for ${qdrantCollection}`);
        return [];
      }

      // Step 3: Extract IDs from Qdrant results
      const qdrantIds = qdrantResults.map((result) => new Types.ObjectId(result.payload.id));
      const scoreMap = new Map(qdrantResults.map((r) => [r.payload.id, r.score]));

      // Step 4: Retrieve data from MongoDB with role-based filtering
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

      // Step 4: Execute aggregation and map results
      const mongoResults = await model.aggregate(pipeline);

      return mongoResults.map((doc) => {
        const convertedDoc = this.convertObjectIdsToStrings(doc);
        const docId = doc._id.toString();
        const score = scoreMap.get(docId) || 0;

        console.log(JSON.stringify(doc, null, 2))

        return {
          collection,
          documentId: docId,
          snippet: this.buildSnippet(userContext.role, collection, [convertedDoc]),
          score,
          metadata: convertedDoc,
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

  private getModelForCollection(collection: string): Model<any> | null {
    const models = {
      doctorschedules: this.doctorScheduleModel,
      examinations: this.examinationModel,
      registrations: this.registrationModel,
      dashboards: this.dashboardModel,
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
        embeddingText: 1,
      },
    };

    /** LIST FIELD YANG HARUS DI-HIDE PER ROLE */
    const fieldsToRemove: Record<UserRole, any> = {
      patient: {
        examinations: ['doctorId'],
        registrations: ['doctorId'],
        doctorschedules: [],
        dashboards: [],
      },

      doctor: {
        examinations: ['patientId', "'patient.fullName'"],
        registrations: ['patientId', "'patient.fullName'"],
        doctorschedules: [],
        dashboards: [],
      },

      admin: {
        examinations: ['diagnosisSummary', 'doctorNotes', 'patientId', "'patient.fullName'"],
        registrations: ['patientId', "'patient.fullName'"],
        doctorschedules: [],
        dashboards: [],
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

  private buildPromptInstruction(role: string): string {
    const roleInstructions: Record<string, string> = {
      patient: `
You are an AI assistant that provides clear, simple, and helpful explanations to patients.
Your responsibilities:
- Explain doctor schedules, basic examination summaries, and general health information.
- Provide general education about diagnoses, medical terms, and healthy lifestyle guidance.
- Do NOT provide new medical diagnoses, predict illnesses, or prescribe medication.
- Always encourage consulting a certified medical professional for accurate medical assessment.
- Do NOT reveal private data of any other patient or doctor beyond the provided snippet.
  `,

      doctor: `
You are an AI assistant supporting doctors with medical reference information.
Your responsibilities:
- Help summarize trends, examination patterns, and general medical guidelines.
- Provide clinical context but NOT patient-specific medical advice.
- Do NOT generate new diagnoses or clinical decisions.
- Do NOT reveal private patient information beyond the anonymized snippet provided.
- Focus purely on supporting analysis, education, and professional reference.
  `,

      admin: `
You are an AI assistant supporting clinic administrators and operational staff.
Your responsibilities:
- Provide administrative insights about schedules, queues, and service performance.
- Provide high-level insights, aggregated trends, and operational summaries.
- Explain non-medical, non-sensitive information related to clinic operations.
- Do NOT provide or infer personal medical information about any patient.
- Do NOT access or reveal individual medical details or personal information.
- Do NOT generate diagnosis, medical interpretation, or treatment suggestions.
- Keep responses focused on administrative and operational context only.
  `,
    };

    return roleInstructions[role] || roleInstructions.patient;
  }

  private buildMessages(
    query: string,
    results: RetrievalResult[],
    userContext: UserContext,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    previousTopic?: string,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const instruction = this.buildPromptInstruction(userContext.role);
    const context = results
      .map((r, idx) => `[${idx + 1}] [${r.collection}] ${r.snippet}`)
      .join('\n');

    const system = `${instruction}
${previousTopic ? `PREVIOUS TOPIC: "${previousTopic}". Use only as supporting context; always prioritize the current query.` : ''}

You are an AI assistant operating inside a medical information system and must answer ONLY using the provided context snippets.

ROLE BEHAVIOR:
- Patient: Provide clear, simple, empathetic educational explanations. No medical judgment.
- Doctor: Provide concise, clinical, data-focused explanations. Do not add patient-identifying details beyond the snippet.
- Admin: Provide administrative/operational explanations and broader operational summaries, strictly limited to snippet information.
- Default: Communicate with patient-friendly clarity.

OUTPUT LANGUAGE:
- Your final JSON output MUST be in Indonesian.

CONTEXT RULES:
- Use ONLY the information contained in the retrieved context snippets.
- If essential information is missing, set needsMoreInfo=true and ask ONE concise clarifying question.
- Do NOT provide new diagnoses, medical decisions, or treatment recommendations.
- Maintain privacy: do not reveal or infer personal data not present in the snippets.
- Keep answers concise, factual, and role-appropriate.

RESPONSE FORMAT:
You MUST respond in this exact JSON structure with no extra text:

{
  "answer": string,
  "needsMoreInfo": boolean,
  "followUpQuestion": string | null,
  "suggestedFollowUps": string[],
  "questionTopic": string,
  "isTopicChanged": boolean
}

TOPIC CHANGE LOGIC:
${previousTopic
        ? `- Previous topic: "${previousTopic}"
- Current query: "${query}"
- Set isTopicChanged=false if the user is continuing, refining, or clarifying the same topic.
- Set isTopicChanged=true ONLY if the user switches to a fundamentally different topic.`
        : `- First query → isTopicChanged=false.`
      }


    `;
    const contextBlock = `Context:\n${context}`;
    const userTurn = `User Question: ${query}`;

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];
    messages.push({ role: 'system', content: system });
    // Replay trimmed history
    for (const m of history) {
      if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
        messages.push({ role: m.role as 'user' | 'assistant', content: m.content });
      }
    }
    messages.push({ role: 'user', content: `${contextBlock}\n\n${userTurn}` });
    return messages;
  }

  private buildSnippet(role: UserRole, collection: string, data: any[]): string {
    const builders: Record<UserRole, (c: string, d: any[]) => string> = {
      patient: this.buildPatientSnippet.bind(this),
      doctor: this.buildDoctorSnippet.bind(this),
      admin: this.buildAdminSnippet.bind(this),
    };

    const builder = builders[role];
    return builder(collection, data);
  }

  private buildPatientSnippet(collection: string, data: any[]): string {
    switch (collection) {
      case 'doctorschedules':
        return data
          .map(
            (d) => `
Jadwal Dokter:
- Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
- Hari: ${d.dayOfWeek}
- Waktu: ${d.startTime} - ${d.endTime}
- Kuota: ${d.quota}
`,
          )
          .join('\n');

      case 'examinations':
        return data
          .map(
            (d) => `
Ringkasan Pemeriksaan Anda:
- Tanggal: ${d.examinationDate}
- Status: ${d.status}
- Ringkasan Diagnosis: ${d.diagnosisSummary}
- Catatan Dokter: ${d.doctorNotes}

Informasi ini bersifat edukatif dan bukan pengganti konsultasi langsung dengan dokter.
`,
          )
          .join('\n');

      case 'registrations':
        return data
          .map(
            (d) => `
Pendaftaran:
- Tanggal Pendaftaran: ${d.registrationDate}
- Metode: ${d.registrationMethod}
- Status: ${d.status}
- Nomor Antrian: ${d.queueNumber}
- Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
`,
          )
          .join('\n');

      case 'dashboards':
        return data
          .map(
            (d) => `
Metrik Dashboard Klinik:
- Tanggal: ${d.date}
- Total Pasien: ${d.totalPatients}
- Total Pendaftaran: ${d.totalRegistrations}
- Selesai: ${d.totalCompleted}, Menunggu: ${d.totalWaiting}, Sedang Diperiksa: ${d.totalExamining}, Dibatalkan: ${d.totalCancelled}
- Pendaftaran Online: ${d.registrationMethod?.online ?? 0}, Offline: ${d.registrationMethod?.offline ?? 0}
`,
          )
          .join('\n');

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private buildDoctorSnippet(collection: string, data: any[]): string {
    switch (collection) {
      case 'examinations':
        return data
          .map(
            (d) => `
Data Pemeriksaan (Anonim):
- Tanggal: ${d.examinationDate}
- Status: ${d.status}
- Ringkasan Diagnosis: ${d.diagnosisSummary}
- Catatan Dokter: ${d.doctorNotes}
- Dokter Pemeriksa: ${d.doctor.fullName}

Catatan: Identitas pasien telah dianonimkan sesuai kebijakan privasi.
`,
          )
          .join('\n');

      case 'registrations':
        return data
          .map(
            (d) => `
Pendaftaran (Anonim):
- Tanggal: ${d.registrationDate}
- Status: ${d.status}
- Nomor Antrian: ${d.queueNumber}
- Dokter: ${d.doctor.fullName}
`,
          )
          .join('\n');

      case 'doctorschedules':
        return data
          .map(
            (d) => `
Jadwal Dokter:
- Nama Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
- Hari: ${d.dayOfWeek}
- Waktu: ${d.startTime} - ${d.endTime}
- Kuota: ${d.quota}
`,
          )
          .join('\n');

      case 'dashboards':
        return data
          .map(
            (d) => `
Metrik Dashboard Klinik:
- Tanggal: ${d.date}
- Total Pasien: ${d.totalPatients}
- Total Pendaftaran: ${d.totalRegistrations}
- Selesai: ${d.totalCompleted}, Menunggu: ${d.totalWaiting}, Sedang Diperiksa: ${d.totalExamining}, Dibatalkan: ${d.totalCancelled}
- Pendaftaran Online: ${d.registrationMethod?.online ?? 0}, Offline: ${d.registrationMethod?.offline ?? 0}
`,
          )
          .join('\n');

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private buildAdminSnippet(collection: string, data: any[]): string {

    switch (collection) {
      case 'examinations':
        return data
          .map(
            (d) => `
Data Pemeriksaan (Non-Medis):
- Tanggal: ${JSON.stringify(d.examinationDate)}
- Status: ${d.status}

Catatan: Diagnosis dan catatan dokter disembunyikan sesuai kebijakan.
`,
          )
          .join('\n');

      case 'registrations':
        return data
          .map(
            (d) => `
Pendaftaran:
- Tanggal: ${d.registrationDate}
- Metode: ${d.registrationMethod}
- Status: ${d.status}
- Nomor Antrian: ${d.queueNumber}
- Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
`,
          )
          .join('\n');

      case 'doctorschedules':
        return data
          .map(
            (d) => `
Jadwal Dokter:
- Dokter: ${d.doctor.fullName}
- Spesialisasi: ${d.doctor.specialization ?? 'N/A'}
- Hari: ${d.dayOfWeek}
- Waktu: ${d.startTime} - ${d.endTime}
- Kuota: ${d.quota}
`,
          )
          .join('\n');

      case 'dashboards':
        return data
          .map(
            (d) => `
Metrik Dashboard Klinik:
- Tanggal: ${d.date}
- Total Pasien: ${d.totalPatients}
- Total Pendaftaran: ${d.totalRegistrations}
- Selesai: ${d.totalCompleted}, Menunggu: ${d.totalWaiting}, Sedang Diperiksa: ${d.totalExamining}, Dibatalkan: ${d.totalCancelled}
- Pendaftaran Online: ${d.registrationMethod?.online ?? 0}, Offline: ${d.registrationMethod?.offline ?? 0}
`,
          )
          .join('\n');

      default:
        return JSON.stringify(data, null, 2);
    }
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
    return results.sort((a, b) => b.score - a.score).slice(0, 8);
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

  /**
   * Convert all ObjectIds to strings recursively
   * Only converts ObjectId instances, preserves Date objects and other types
   */
  private convertObjectIdsToStrings(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    // Handle Date objects - preserve as-is
    if (obj instanceof Date) {
      return obj;
    }

    // Handle ObjectId
    if (obj._bsontype === 'ObjectId' || (obj.toString && typeof obj.toString === 'function' && obj.constructor.name === 'ObjectId')) {
      return obj.toString();
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertObjectIdsToStrings(item));
    }

    // Handle objects (but not Date or other built-in types)
    if (typeof obj === 'object' && obj.constructor === Object) {
      const converted: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          converted[key] = this.convertObjectIdsToStrings(obj[key]);
        }
      }
      return converted;
    }

    return obj;
  }
}
