import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from '../../common/services/embedding/embedding.service';
import { Dashboard } from '../dashboard/schemas/dashboard.schema';
import { Registration } from '../registrations/schemas/registration.schema';
import { Examination } from '../examinations/schemas/examination.schema';
import { DoctorSchedule } from '../doctorSchedules/schemas/doctor-schedule.schema';
import { ClinicInfo } from '../clinic-info/schemas/clinic-info.schema';
import { QdrantCollection, QdrantRequestDto } from './qdrant.dto';
import { EmbeddingTextBuilderService } from '../rag/services/embedding-text-builder.service';
@Injectable()
export class QdrantIndexingService {
  private readonly logger = new Logger(QdrantIndexingService.name);

  // Collection names
  private readonly DASHBOARD_COLLECTION = 'dashboards';
  private readonly REGISTRATION_COLLECTION = 'registrations';
  private readonly EXAMINATION_COLLECTION = 'examinations';
  private readonly SCHEDULE_COLLECTION = 'doctor_schedules';
  private readonly CLINIC_INFO_COLLECTION = 'clinic_info';

  constructor(
    @InjectModel(Dashboard.name) private dashboardModel: Model<Dashboard>,
    @InjectModel(Registration.name) private registrationModel: Model<Registration>,
    @InjectModel(Examination.name) private examinationModel: Model<Examination>,
    @InjectModel(DoctorSchedule.name) private doctorScheduleModel: Model<DoctorSchedule>,
    @InjectModel(ClinicInfo.name) private clinicInfoModel: Model<ClinicInfo>,
    private qdrantService: QdrantService,
    private embeddingService: EmbeddingService,
    private embeddingTextBuilderService: EmbeddingTextBuilderService,
  ) {}

  /**
   * Initialize all collections
   */
  async initializeCollections(collections?: QdrantCollection[]): Promise<void> {
    try {
      this.logger.log('🔄 Initializing Qdrant collections...');

      if (collections && collections.includes(QdrantCollection.DASHBOARDS)) {
        await this.qdrantService.createCollection(this.DASHBOARD_COLLECTION);
      }
      if (collections && collections.includes(QdrantCollection.REGISTRATIONS)) {
        await this.qdrantService.createCollection(this.REGISTRATION_COLLECTION);
      }
      if (collections && collections.includes(QdrantCollection.EXAMINATIONS)) {
        await this.qdrantService.createCollection(this.EXAMINATION_COLLECTION);
      }
      if (collections && collections.includes(QdrantCollection.SCHEDULES)) {
        await this.qdrantService.createCollection(this.SCHEDULE_COLLECTION);
      }
      if (collections && collections.includes(QdrantCollection.CLINIC_INFO)) {
        await this.qdrantService.createCollection(this.CLINIC_INFO_COLLECTION);
      }

      this.logger.log('✅ All collections initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing collections:', error);
      throw error;
    }
  }

  /**
   * Index all dashboards (parallel processing)
   */
  async indexAllDashboards(): Promise<number> {
    try {
      this.logger.log('🔄 Indexing all dashboards...');

      const dashboards = await this.dashboardModel.find();
      this.logger.log(`📊 Found ${dashboards.length} dashboards to index`);

      if (dashboards.length === 0) {
        return 0;
      }

      const BATCH_SIZE = 10;
      let successCount = 0;
      let processedCount = 0;

      for (let i = 0; i < dashboards.length; i += BATCH_SIZE) {
        const batch = dashboards.slice(i, i + BATCH_SIZE);
        try {
          await this.indexDashboard(batch);
          successCount += batch.length;
        } catch (error) {
          this.logger.error(`Error indexing dashboard batch:`, error);
        }
        processedCount += batch.length;

        const progress = Math.round((processedCount / dashboards.length) * 100);
        this.logger.log(`   Progress: ${progress}% (${processedCount}/${dashboards.length})`);
      }

      this.logger.log(`✅ Dashboard indexing completed: ${successCount}/${dashboards.length}`);
      return successCount;
    } catch (error) {
      this.logger.error('Error indexing all dashboards:', error);
      throw error;
    }
  }

  /**
   * Index multiple dashboards
   */
  async indexDashboard(dashboards: any | any[]): Promise<void> {
    try {
      // Handle both single and multiple dashboards
      const dashboardArray = Array.isArray(dashboards) ? dashboards : [dashboards];

      // Generate hybrid embeddings for all dashboards
      const points: any[] = [];
      for (const dashboard of dashboardArray) {
        const embeddingText =
          this.embeddingTextBuilderService.buildDashboardEmbeddingText(dashboard);
        const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(embeddingText);

        points.push({
          id: dashboard._id.toString(),
          vector: {
            dense: hybridEmbedding.dense,
            bm25: hybridEmbedding.sparse,
          },
          payload: {
            id: dashboard._id.toString(),
            date: dashboard.date,
            totalPatients: dashboard.totalPatients,
            totalRegistrations: dashboard.totalRegistrations,
            totalCompleted: dashboard.totalCompleted,
            totalWaiting: dashboard.totalWaiting,
            totalExamining: dashboard.totalExamining,
            totalCancelled: dashboard.totalCancelled,
            embeddingText,
            type: 'dashboard',
          },
        });
      }

      // Index all points in one batch call
      await this.qdrantService.indexs(this.DASHBOARD_COLLECTION, points);

      this.logger.debug(`✅ ${dashboardArray.length} dashboard(s) indexed with hybrid embeddings`);
    } catch (error) {
      this.logger.error(`Error indexing dashboard(s):`, error);
      throw error;
    }
  }

  /**
   * Index all registrations (parallel processing)
   */
  async indexAllRegistrations(): Promise<number> {
    try {
      this.logger.log('🔄 Indexing all registrations...');

      const registrations = await this.registrationModel
        .find()
        .populate('doctorId', 'fullName specialization')
        .populate('scheduleId', 'dayOfWeek startTime endTime');

      this.logger.log(`📋 Found ${registrations.length} registrations to index`);

      if (registrations.length === 0) {
        return 0;
      }

      const BATCH_SIZE = 10;
      let successCount = 0;
      let processedCount = 0;

      for (let i = 0; i < registrations.length; i += BATCH_SIZE) {
        const batch = registrations.slice(i, i + BATCH_SIZE);
        try {
          await this.indexRegistration(batch);
          successCount += batch.length;
        } catch (error) {
          this.logger.error(`Error indexing registration batch:`, error);
        }
        processedCount += batch.length;

        const progress = Math.round((processedCount / registrations.length) * 100);
        this.logger.log(`   Progress: ${progress}% (${processedCount}/${registrations.length})`);
      }

      this.logger.log(
        `✅ Registration indexing completed: ${successCount}/${registrations.length}`,
      );
      return successCount;
    } catch (error) {
      this.logger.error('Error indexing all registrations:', error);
      throw error;
    }
  }

  /**
   * Index multiple registrations
   */
  async indexRegistration(registrations: any | any[]): Promise<void> {
    try {
      // Handle both single and multiple registrations
      const registrationArray = Array.isArray(registrations) ? registrations : [registrations];

      // Generate hybrid embeddings for all registrations
      const points: any[] = [];
      for (const registration of registrationArray) {
        const embeddingText =
          this.embeddingTextBuilderService.buildRegistrationEmbeddingText(registration);
        const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(embeddingText);

        points.push({
          id: registration._id.toString(),
          vector: {
            dense: hybridEmbedding.dense,
            bm25: hybridEmbedding.sparse,
          },
          payload: {
            id: registration._id.toString(),
            date: registration.registrationDate,
            registrationMethod: registration.registrationMethod,
            status: registration.status,
            doctorId: registration.doctorId._id,
            patientId: registration.patientId._id,
            embeddingText,
            type: 'registration',
          },
        });
      }

      // Index all points in one batch call
      await this.qdrantService.indexs(this.REGISTRATION_COLLECTION, points);

      this.logger.debug(
        `✅ ${registrationArray.length} registration(s) indexed with hybrid embeddings`,
      );
    } catch (error) {
      this.logger.error(`Error indexing registration(s):`, error);
      throw error;
    }
  }

  /**
   * Index all examinations (parallel processing)
   */
  async indexAllExaminations(): Promise<number> {
    try {
      this.logger.log('🔄 Indexing all examinations...');

      const examinations = await this.examinationModel
        .find()
        .populate('doctorId', 'fullName specialization')
        .populate('patientId', 'fullName');

      this.logger.log(`🏥 Found ${examinations.length} examinations to index`);

      if (examinations.length === 0) {
        return 0;
      }

      const BATCH_SIZE = 10;
      let successCount = 0;
      let processedCount = 0;

      for (let i = 0; i < examinations.length; i += BATCH_SIZE) {
        const batch = examinations.slice(i, i + BATCH_SIZE);
        try {
          await this.indexExamination(batch);
          successCount += batch.length;
        } catch (error) {
          this.logger.error(`Error indexing examination batch:`, error);
        }
        processedCount += batch.length;

        const progress = Math.round((processedCount / examinations.length) * 100);
        this.logger.log(`   Progress: ${progress}% (${processedCount}/${examinations.length})`);
      }

      this.logger.log(`✅ Examination indexing completed: ${successCount}/${examinations.length}`);
      return successCount;
    } catch (error) {
      this.logger.error('Error indexing all examinations:', error);
      throw error;
    }
  }

  /**
   * Index multiple examinations
   */
  async indexExamination(examinations: any | any[]): Promise<void> {
    try {
      // Handle both single and multiple examinations
      const examinationArray = Array.isArray(examinations) ? examinations : [examinations];

      // Generate hybrid embeddings for all examinations
      const points: any[] = [];
      for (const examination of examinationArray) {
        const embeddingText =
          this.embeddingTextBuilderService.buildExaminationEmbeddingText(examination);
        const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(embeddingText);

        points.push({
          id: examination._id.toString(),
          vector: {
            dense: hybridEmbedding.dense,
            bm25: hybridEmbedding.sparse,
          },
          payload: {
            id: examination._id.toString(),
            date: examination.examinationDate,
            status: examination.status,
            doctorId: examination.doctorId._id,
            patientId: examination.patientId._id,
            embeddingText,
            type: 'examination',
          },
        });
      }

      // Index all points in one batch call
      await this.qdrantService.indexs(this.EXAMINATION_COLLECTION, points);

      this.logger.debug(
        `✅ ${examinationArray.length} examination(s) indexed with hybrid embeddings`,
      );
    } catch (error) {
      this.logger.error(`Error indexing examination(s):`, error);
      throw error;
    }
  }

  /**
   * Index all doctor schedules (parallel processing)
   */
  async indexAllSchedules(): Promise<number> {
    try {
      this.logger.log('🔄 Indexing all doctor schedules...');

      const schedules = await this.doctorScheduleModel
        .find()
        .populate('doctorId', 'fullName specialization');

      this.logger.log(`📅 Found ${schedules.length} schedules to index`);

      if (schedules.length === 0) {
        return 0;
      }

      const BATCH_SIZE = 10;
      let successCount = 0;
      let processedCount = 0;

      for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
        const batch = schedules.slice(i, i + BATCH_SIZE);
        try {
          await this.indexSchedule(batch);
          successCount += batch.length;
        } catch (error) {
          this.logger.error(`Error indexing schedule batch:`, error);
        }
        processedCount += batch.length;

        const progress = Math.round((processedCount / schedules.length) * 100);
        this.logger.log(`   Progress: ${progress}% (${processedCount}/${schedules.length})`);
      }

      this.logger.log(`✅ Schedule indexing completed: ${successCount}/${schedules.length}`);
      return successCount;
    } catch (error) {
      this.logger.error('Error indexing all schedules:', error);
      throw error;
    }
  }

  /**
   * Index multiple doctor schedules
   */
  async indexSchedule(schedules: any | any[]): Promise<void> {
    try {
      // Handle both single and multiple schedules
      const scheduleArray = Array.isArray(schedules) ? schedules : [schedules];

      // Generate hybrid embeddings for all schedules
      const points: any[] = [];
      for (const schedule of scheduleArray) {
        const embeddingText = this.embeddingTextBuilderService.buildScheduleEmbeddingText(schedule);
        const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(embeddingText);

        points.push({
          id: schedule._id.toString(),
          vector: {
            dense: hybridEmbedding.dense,
            bm25: hybridEmbedding.sparse,
          },
          payload: {
            id: schedule._id.toString(),
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            quota: schedule.quota,
            doctorId: schedule.doctorId._id,
            doctorName: schedule.doctorId?.fullName || 'Unknown',
            doctorSpecialization: schedule.doctorId?.specialization || 'Unknown',
            embeddingText,
            type: 'schedule',
          },
        });
      }

      // Index all points in one batch call
      await this.qdrantService.indexs(this.SCHEDULE_COLLECTION, points);

      this.logger.debug(`✅ ${scheduleArray.length} schedule(s) indexed with hybrid embeddings`);
    } catch (error) {
      this.logger.error(`Error indexing schedule(s):`, error);
      throw error;
    }
  }

  /**
   * Index all clinic info (parallel processing)
   */
  async indexAllClinicInfo(): Promise<number> {
    try {
      this.logger.log('🔄 Indexing all clinic info...');

      const clinicInfos = await this.clinicInfoModel.find();
      this.logger.log(`📋 Found ${clinicInfos.length} clinic info to index`);

      if (clinicInfos.length === 0) {
        return 0;
      }

      const BATCH_SIZE = 10;
      let successCount = 0;
      let processedCount = 0;

      for (let i = 0; i < clinicInfos.length; i += BATCH_SIZE) {
        const batch = clinicInfos.slice(i, i + BATCH_SIZE);
        try {
          await this.indexClinicInfo(batch);
          successCount += batch.length;
        } catch (error) {
          this.logger.error(`Error indexing clinic info batch:`, error);
        }
        processedCount += batch.length;

        const progress = Math.round((processedCount / clinicInfos.length) * 100);
        this.logger.log(`   Progress: ${progress}% (${processedCount}/${clinicInfos.length})`);
      }

      this.logger.log(`✅ Clinic info indexing completed: ${successCount}/${clinicInfos.length}`);
      return successCount;
    } catch (error) {
      this.logger.error('Error indexing all clinic info:', error);
      throw error;
    }
  }

  /**
   * Index multiple clinic info
   */
  async indexClinicInfo(clinicInfos: any | any[]): Promise<void> {
    try {
      const clinicInfoArray = Array.isArray(clinicInfos) ? clinicInfos : [clinicInfos];

      const points: any[] = [];
      for (const clinicInfo of clinicInfoArray) {
        const embeddingText =
          this.embeddingTextBuilderService.buildClinicInfoEmbeddingText(clinicInfo);
        const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(embeddingText);

        points.push({
          id: clinicInfo._id.toString(),
          vector: {
            dense: hybridEmbedding.dense,
            bm25: hybridEmbedding.sparse,
          },
          payload: {
            id: clinicInfo._id.toString(),
            title: clinicInfo.title,
            category: clinicInfo.category,
            createdAt: clinicInfo.createdAt,
            embeddingText,
            type: 'clinic_info',
          },
        });
      }

      await this.qdrantService.indexs(this.CLINIC_INFO_COLLECTION, points);

      this.logger.debug(
        `✅ ${clinicInfoArray.length} clinic info(s) indexed with hybrid embeddings`,
      );
    } catch (error) {
      this.logger.error(`Error indexing clinic info(s):`, error);
      throw error;
    }
  }

  /**
   * Index all collections
   */
  async index(collections?: QdrantCollection[]): Promise<{
    dashboards: number;
    registrations: number;
    examinations: number;
    schedules: number;
    clinicInfos: number;
  }> {
    try {
      this.logger.log('🔄 Starting indexing...');

      // Default to all collections if not specified
      const collectionsToIndex = collections || [
        'dashboards',
        'registrations',
        'examinations',
        'schedules',
        'clinic_info',
      ];

      let dashboards = 0;
      let registrations = 0;
      let examinations = 0;
      let schedules = 0;
      let clinicInfos = 0;

      if (collectionsToIndex.includes('dashboards')) {
        dashboards = await this.indexAllDashboards();
      }
      if (collectionsToIndex.includes('registrations')) {
        registrations = await this.indexAllRegistrations();
      }
      if (collectionsToIndex.includes('examinations')) {
        examinations = await this.indexAllExaminations();
      }
      if (collectionsToIndex.includes('schedules')) {
        schedules = await this.indexAllSchedules();
      }
      if (collectionsToIndex.includes('clinic_info')) {
        clinicInfos = await this.indexAllClinicInfo();
      }

      this.logger.log('✅ Indexing completed');
      return { dashboards, registrations, examinations, schedules, clinicInfos };
    } catch (error) {
      this.logger.error('Error during indexing:', error);
      throw error;
    }
  }

  // ============ Embedding Text Builders ============

  /**
   * Reindex all collections (delete and recreate)
   * Flow: Delete all collections -> Create collections -> Index all data
   */
  async reindexAll(): Promise<{
    dashboards: number;
    registrations: number;
    examinations: number;
    schedules: number;
    clinicInfos: number;
  }> {
    try {
      this.logger.log('🔄 Starting full reindexing process...');

      // Step 1: Delete all collections
      this.logger.log('📋 Step 1: Deleting all collections...');
      await this.qdrantService.deleteCollection(this.DASHBOARD_COLLECTION).catch(() => null);
      await this.qdrantService.deleteCollection(this.REGISTRATION_COLLECTION).catch(() => null);
      await this.qdrantService.deleteCollection(this.EXAMINATION_COLLECTION).catch(() => null);
      await this.qdrantService.deleteCollection(this.SCHEDULE_COLLECTION).catch(() => null);
      await this.qdrantService.deleteCollection(this.CLINIC_INFO_COLLECTION).catch(() => null);
      this.logger.log('✅ All collections deleted');

      // Step 2: Create collections
      this.logger.log('📋 Step 2: Creating collections...');
      await this.initializeCollections([
        QdrantCollection.DASHBOARDS,
        QdrantCollection.REGISTRATIONS,
        QdrantCollection.EXAMINATIONS,
        QdrantCollection.SCHEDULES,
        QdrantCollection.CLINIC_INFO,
      ]);
      this.logger.log('✅ All collections created');

      // Step 3: Index all data
      this.logger.log('📋 Step 3: Indexing all data...');
      const results = await this.index([
        QdrantCollection.DASHBOARDS,
        QdrantCollection.REGISTRATIONS,
        QdrantCollection.EXAMINATIONS,
        QdrantCollection.SCHEDULES,
        QdrantCollection.CLINIC_INFO,
      ]);
      this.logger.log('✅ All data indexed');

      this.logger.log('🎉 Full reindexing completed successfully');
      return results;
    } catch (error) {
      this.logger.error('Error during reindexing:', error);
      throw error;
    }
  }
}
