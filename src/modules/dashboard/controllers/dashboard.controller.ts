import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/schemas/user.schema';
import { ApiHttpResponse } from '../../../common/decorators/api-response.decorator';

export class RegenerateDashboardDto {
    startDate!: string;
    endDate!: string;
}

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
    private readonly logger = new Logger(DashboardController.name);

    constructor(private readonly dashboardService: DashboardService) { }

    @Post('regenerate')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary: 'Regenerate dashboard metrics for a date range',
        description:
            'Manually recalculate and save dashboard data for a specific date range. ' +
            'For each date in the range, calculates metrics from registrations collection and saves to dashboards collection. ' +
            'If document for a date already exists, it will be updated. ' +
            'Only accessible by admin users.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                startDate: {
                    type: 'string',
                    format: 'date',
                    description: 'Start date in format YYYY-MM-DD',
                    example: '2025-01-01',
                },
                endDate: {
                    type: 'string',
                    format: 'date',
                    description: 'End date in format YYYY-MM-DD',
                    example: '2025-01-31',
                },
            },
            required: ['startDate', 'endDate'],
        },
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
}
