import { Controller, Post, UseGuards, Logger, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '../users/schemas/user.schema';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QdrantIndexingService } from 'src/modules/qdrant/qdrant-indexing.service';
import { QdrantService } from 'src/modules/qdrant/qdrant.service';
import { ApiHttpResponse } from 'src/common/decorators/api-response.decorator';
import {
  QdrantRequestDto,
  QdrantIndexResponseDto,
  QdrantInitializeResponseDto,
  QdrantReindexResponseDto,
} from './qdrant.dto';

@ApiTags('Qdrant Vector Search')
@Controller('qdrant')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class QdrantController {
  private readonly logger = new Logger(QdrantController.name);

  constructor(
    private readonly qdrantIndexingService: QdrantIndexingService,
    private readonly qdrantService: QdrantService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post('initialize')
  @ApiOperation({
    summary: 'Initialize all Qdrant collections',
    description:
      'Create all necessary Qdrant vector collections for RAG system. ' +
      'Collections: dashboards, registrations, examinations, doctor_schedules. ' +
      'Only accessible by admin users.',
  })
  @ApiHttpResponse(200, 'Collections initialized successfully', QdrantInitializeResponseDto)
  async initializeCollections(@Body() dto: QdrantRequestDto): Promise<QdrantInitializeResponseDto> {
    this.logger.log('Initializing Qdrant collections');

    await this.qdrantIndexingService.initializeCollections(dto.collections);

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
  @Post('index')
  @ApiOperation({
    summary: 'Index selected collections to Qdrant',
    description:
      'Index documents from MongoDB to Qdrant vector database. ' +
      'If no collections are specified, all collections will be indexed. ' +
      'Supported collections: dashboards, registrations, examinations, schedules. ' +
      'Only accessible by admin users.',
  })
  @ApiHttpResponse(200, 'Indexing completed successfully', QdrantIndexResponseDto)
  async index(@Body() dto: QdrantRequestDto): Promise<QdrantIndexResponseDto> {
    this.logger.log(`Indexing collections: ${dto.collections?.join(', ') || 'all'}`);
    const results = await this.qdrantIndexingService.index(dto.collections);
    return {
      success: true,
      statusCode: 200,
      message: dto.collections
        ? `Collections [${dto.collections.join(', ')}] indexed successfully`
        : 'All collections indexed successfully',
      data: {
        dashboards: results.dashboards,
        registrations: results.registrations,
        examinations: results.examinations,
        schedules: results.schedules,
        total:
          results.dashboards + results.registrations + results.examinations + results.schedules,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Roles(UserRole.ADMIN)
  @Post('reindex-all')
  @ApiOperation({
    summary: 'Reindex all collections (delete and recreate)',
    description:
      'Perform a complete reindexing operation: ' +
      '1. Delete all existing Qdrant collections ' +
      '2. Create fresh collections ' +
      '3. Index all records from MongoDB to Qdrant ' +
      'This operation clears all vector data and rebuilds from scratch. ' +
      'Only accessible by admin users.',
  })
  @ApiHttpResponse(200, 'All collections reindexed successfully', QdrantReindexResponseDto)
  async reindexAll(): Promise<QdrantReindexResponseDto> {
    this.logger.log('Starting full reindexing of all collections');

    const results = await this.qdrantIndexingService.reindexAll();

    return {
      success: true,
      statusCode: 200,
      message: 'All collections reindexed successfully',
      data: {
        dashboards: results.dashboards,
        registrations: results.registrations,
        examinations: results.examinations,
        schedules: results.schedules,
        total:
          results.dashboards + results.registrations + results.examinations + results.schedules,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
