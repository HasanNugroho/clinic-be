import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString } from 'class-validator';
import { UserRole } from '../users/schemas/user.schema';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import { ApiHttpResponse } from 'src/common/decorators/api-response.decorator';

export class RegenerateDashboardDto {
    @ApiProperty({
        description: 'Start date for dashboard regeneration',
        example: '2025-01-01',
        type: String,
        format: 'date',
    })
    @IsDateString()
    startDate: string;

    @ApiProperty({
        description: 'End date for dashboard regeneration',
        example: '2025-01-31',
        type: String,
        format: 'date',
    })
    @IsDateString()
    endDate: string;
}

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class DashboardController {
    private readonly logger = new Logger(DashboardController.name);

    constructor(private readonly dashboardService: DashboardService) { }

    @Roles(UserRole.ADMIN)
    @Post('regenerate')
    @ApiOperation({
        summary: 'Regenerate dashboard metrics for a date range',
        description:
            'Manually recalculate and save dashboard data for a specific date range. ' +
            'For each date in the range, calculates metrics from registrations collection and saves to dashboards collection. ' +
            'If document for a date already exists, it will be updated. ' +
            'Only accessible by admin users.',
    })
    @ApiHttpResponse(200, 'Dashboard metrics regenerated successfully')
    async regenerate(@Body() dto: RegenerateDashboardDto): Promise<any> {
        this.logger.log(`Regenerating dashboard for date range: ${dto.startDate} to ${dto.endDate}`);

        const datesProcessed = await this.dashboardService.regenerateDashboard(dto.startDate, dto.endDate);

        return {
            success: true,
            statusCode: 200,
            message: `Dashboard metrics regenerated successfully for ${datesProcessed} dates`,
            data: {
                datesProcessed,
                startDate: dto.startDate,
                endDate: dto.endDate,
            },
        };
    }

    @Roles(UserRole.ADMIN)
    @Post('generate-embeddings')
    @ApiOperation({
        summary: 'Generate embeddings for all dashboards',
        description:
            'Generate vector embeddings for all existing dashboard records in the database. ' +
            'This processes each dashboard and creates embeddings for RAG (Retrieval Augmented Generation) vector search. ' +
            'Embeddings are generated in Indonesian and include dashboard metrics and statistics. ' +
            'Only accessible by admin users. ' +
            'Processing is done sequentially with progress tracking.',
    })
    @ApiHttpResponse(200, 'Embeddings generated successfully for all dashboards')
    async generateEmbeddings(): Promise<any> {
        this.logger.log('Starting embedding generation for all dashboards');

        const successCount = await this.dashboardService.generateAllDashboardEmbeddings();

        return {
            success: true,
            statusCode: 200,
            message: `Embeddings generated successfully for all dashboards`,
            data: {
                successCount,
                timestamp: new Date().toISOString(),
            },
        };
    }
}
