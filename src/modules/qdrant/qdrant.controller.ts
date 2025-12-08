import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '../users/schemas/user.schema';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QdrantIndexingService } from 'src/modules/qdrant/qdrant-indexing.service';
import { QdrantService } from 'src/modules/qdrant/qdrant.service';
import { ApiHttpResponse } from 'src/common/decorators/api-response.decorator';

@ApiTags('Qdrant Vector Search')
@Controller('qdrant')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class QdrantController {
    private readonly logger = new Logger(QdrantController.name);

    constructor(
        private readonly qdrantIndexingService: QdrantIndexingService,
        private readonly qdrantService: QdrantService,
    ) { }

    @Roles(UserRole.ADMIN)
    @Post('initialize-collections')
    @ApiOperation({
        summary: 'Initialize all Qdrant collections',
        description:
            'Create all necessary Qdrant vector collections for RAG system. ' +
            'Collections: dashboards, registrations, examinations, doctor_schedules. ' +
            'Only accessible by admin users.',
    })
    @ApiHttpResponse(200, 'Collections initialized successfully')
    async initializeCollections(): Promise<any> {
        this.logger.log('Initializing Qdrant collections');

        await this.qdrantIndexingService.initializeCollections();

        return {
            success: true,
            statusCode: 200,
            message: 'Qdrant collections initialized successfully',
            data: {
                collections: ['dashboards', 'registrations', 'examinations', 'doctor_schedules'],
                timestamp: new Date().toISOString(),
            },
        };
    }

    @Roles(UserRole.ADMIN)
    @Post('index-all')
    @ApiOperation({
        summary: 'Index all collections to Qdrant',
        description:
            'Generate embeddings and index all records (dashboards, registrations, examinations, schedules) to Qdrant. ' +
            'This is a comprehensive indexing operation that processes all collections sequentially. ' +
            'Only accessible by admin users.',
    })
    @ApiHttpResponse(200, 'All collections indexed successfully')
    async indexAll(): Promise<any> {
        this.logger.log('Starting full indexing of all collections');

        const results = await this.qdrantIndexingService.indexAll();

        return {
            success: true,
            statusCode: 200,
            message: 'All collections indexed successfully',
            data: {
                dashboards: results.dashboards,
                registrations: results.registrations,
                examinations: results.examinations,
                schedules: results.schedules,
                total: results.dashboards + results.registrations + results.examinations + results.schedules,
                timestamp: new Date().toISOString(),
            },
        };
    }
}
