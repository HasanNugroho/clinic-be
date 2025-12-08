import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Dashboard, DoctorStat, RegistrationMethodBreakdown } from './schemas/dashboard.schema';
import { Registration, RegistrationStatus, RegistrationMethod } from './../registrations/schemas/registration.schema';
import { QdrantIndexingService } from '../qdrant/qdrant-indexing.service';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        @InjectModel(Dashboard.name) private dashboardModel: Model<Dashboard>,
        @InjectModel(Registration.name) private registrationModel: Model<Registration>,
        private qdrantIndexingService: QdrantIndexingService,
    ) { }

    /**
     * Calculate and aggregate dashboard metrics for a specific date
     * @param dateStr Date in format YYYY-MM-DD
     */
    async calculateDashboardMetrics(dateStr: string): Promise<Dashboard> {
        this.logger.log(`Calculating dashboard metrics for date: ${dateStr}`);

        // Parse date to get start and end of day
        const date = new Date(dateStr);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

        // Get all registrations for this date
        const registrations = await this.registrationModel
            .find({
                registrationDate: {
                    $gte: startOfDay,
                    $lte: endOfDay,
                },
            })
            .populate('patientId')
            .populate('doctorId')
            .lean()
            .exec();

        // Calculate metrics
        const totalRegistrations = registrations.length;
        const totalCompleted = registrations.filter((r) => r.status === RegistrationStatus.COMPLETED).length;
        const totalWaiting = registrations.filter((r) => r.status === RegistrationStatus.WAITING).length;
        const totalExamining = registrations.filter((r) => r.status === RegistrationStatus.EXAMINING).length;
        const totalCancelled = registrations.filter((r) => r.status === RegistrationStatus.CANCELLED).length;

        // Count unique patients
        const uniquePatientIds = new Set(registrations.map((r) => r.patientId?.toString() || r.patientId));
        const totalPatients = uniquePatientIds.size;

        // Count registration methods
        const registrationMethodBreakdown: RegistrationMethodBreakdown = {
            online: registrations.filter((r) => r.registrationMethod === RegistrationMethod.ONLINE).length,
            offline: registrations.filter((r) => r.registrationMethod === RegistrationMethod.OFFLINE).length,
        };

        // Calculate doctor statistics
        const doctorStatsMap = new Map<string, DoctorStat>();

        for (const registration of registrations) {
            const doctorId = typeof registration.doctorId === 'string' ? registration.doctorId : (registration.doctorId as any)?._id?.toString();
            const doctorName = typeof registration.doctorId === 'string' ? 'Unknown' : (registration.doctorId as any)?.fullName || 'Unknown';

            if (!doctorId) continue;

            if (!doctorStatsMap.has(doctorId)) {
                doctorStatsMap.set(doctorId, {
                    doctorId,
                    doctorName,
                    totalRegistrations: 0,
                    totalCompleted: 0,
                });
            }

            const doctorStat = doctorStatsMap.get(doctorId)!;
            doctorStat.totalRegistrations += 1;

            if (registration.status === RegistrationStatus.COMPLETED) {
                doctorStat.totalCompleted += 1;
            }
        }

        const doctorStats = Array.from(doctorStatsMap.values());

        // Create or update dashboard document
        const dashboardData = {
            date: dateStr,
            totalPatients,
            totalRegistrations,
            totalCompleted,
            totalWaiting,
            totalExamining,
            totalCancelled,
            registrationMethod: registrationMethodBreakdown,
            doctorStats,
        };

        const dashboard = await this.dashboardModel.findOneAndUpdate(
            { date: dateStr },
            dashboardData,
            { upsert: true, new: true },
        );

        this.logger.log(`Dashboard metrics calculated and saved for date: ${dateStr}`);
        return dashboard;
    }

    /**
     * Regenerate dashboard metrics for a date range
     * @param startDate Date in format YYYY-MM-DD
     * @param endDate Date in format YYYY-MM-DD
     * @returns Number of dates processed
     */
    async regenerateDashboard(startDate: string, endDate: string): Promise<number> {
        this.logger.log(`Regenerating dashboard for date range: ${startDate} to ${endDate}`);

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            throw new Error('Start date must be before or equal to end date');
        }

        let datesProcessed = 0;
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            try {
                await this.calculateDashboardMetrics(dateStr);
                datesProcessed += 1;
            } catch (error) {
                this.logger.error(`Error calculating dashboard metrics for ${dateStr}:`, error);
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        this.logger.log(`Dashboard regeneration completed. Processed ${datesProcessed} dates.`);
        return datesProcessed;
    }

    /**
     * Get today's date in YYYY-MM-DD format
     */
    private getTodayDateString(): string {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    /**
     * Generate and save embedding for a single dashboard
     */
    async generateAndSaveEmbedding(dashboardId: string): Promise<void> {
        try {
            const dashboard = await this.dashboardModel.findById(dashboardId);
            if (!dashboard) {
                this.logger.warn(`Dashboard not found: ${dashboardId}`);
                return;
            }

            // Index to Qdrant asynchronously (non-blocking)
            this.qdrantIndexingService.indexDashboard(dashboard).catch((error) => {
                this.logger.error(`Failed to index dashboard ${dashboardId} to Qdrant:`, error);
            });
        } catch (error) {
            this.logger.error(`❌ Error generating embedding for dashboard ${dashboardId}:`, error);
        }
    }

    /**
     * Generate embeddings for multiple dashboards in batch
     */
    async generateBatchEmbeddings(dashboardIds: string[]): Promise<void> {
        this.logger.log(`🔄 Generating embeddings for ${dashboardIds.length} dashboards...`);

        for (let i = 0; i < dashboardIds.length; i++) {
            try {
                await this.generateAndSaveEmbedding(dashboardIds[i]);
                const progress = Math.round(((i + 1) / dashboardIds.length) * 100);
                this.logger.log(`   Progress: ${progress}% (${i + 1}/${dashboardIds.length})`);
            } catch (error) {
                this.logger.error(`Error processing dashboard ${dashboardIds[i]}:`, error);
                // Continue with next dashboard
            }
        }

        this.logger.log(`✅ Batch embedding generation completed`);
    }

    /**
     * Generate embeddings for all dashboards
     */
    async generateAllDashboardEmbeddings(): Promise<number> {
        try {
            this.logger.log(`🔄 Generating embeddings for all dashboards...`);

            // Get all dashboards
            const dashboards = await this.dashboardModel.find();
            this.logger.log(`📊 Found ${dashboards.length} dashboards to process`);

            let successCount = 0;
            for (let i = 0; i < dashboards.length; i++) {
                try {
                    await this.generateAndSaveEmbedding(dashboards[i]._id.toString());
                    successCount++;
                    const progress = Math.round(((i + 1) / dashboards.length) * 100);
                    this.logger.log(`   Progress: ${progress}% (${i + 1}/${dashboards.length})`);
                } catch (error) {
                    this.logger.error(`Error processing dashboard ${dashboards[i]._id}:`, error);
                    // Continue with next dashboard
                }
            }

            this.logger.log(`✅ Embedding generation completed for all dashboards`);
            this.logger.log(`   Total: ${dashboards.length}, Success: ${successCount}, Failed: ${dashboards.length - successCount}`);

            return successCount;
        } catch (error) {
            this.logger.error('Error generating embeddings for all dashboards:', error);
            throw error;
        }
    }

    /**
     * Cron job: Run daily at 11:45 PM to calculate dashboard metrics for the current day
     */
    async dailyCutoffJob(): Promise<void> {
        try {
            const todayStr = this.getTodayDateString();
            this.logger.log(`Running daily cutoff job for date: ${todayStr}`);
            const dashboard = await this.calculateDashboardMetrics(todayStr);

            // Generate embedding asynchronously (non-blocking)
            this.generateAndSaveEmbedding(dashboard._id as string).catch((error) => {
                this.logger.error(`Error generating embedding in daily cutoff job:`, error);
            });

            this.logger.log(`Daily cutoff job completed successfully`);
        } catch (error) {
            this.logger.error('Error in daily cutoff job:', error);
            throw error;
        }
    }
}
