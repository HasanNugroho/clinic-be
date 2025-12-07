import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DashboardService } from '../services/dashboard.service';

@Injectable()
export class DashboardCutoffJob {
    private readonly logger = new Logger(DashboardCutoffJob.name);

    constructor(private readonly dashboardService: DashboardService) { }

    /**
     * Cron job that runs every day at 11:45 PM (23:45)
     * Calculates and aggregates dashboard metrics for the current day
     * Saves the aggregated data to dashboards collection
     */
    @Cron('45 23 * * *')
    async handleDailyCutoff(): Promise<void> {
        this.logger.log('Dashboard daily cutoff job started');
        try {
            await this.dashboardService.dailyCutoffJob();
            this.logger.log('Dashboard daily cutoff job completed successfully');
        } catch (error) {
            this.logger.error('Dashboard daily cutoff job failed:', error);
        }
    }
}
