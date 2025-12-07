import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { QueuesService } from './queues.service';
import { Queue } from './schemas/queue.schema';
import { CreateQueueDto } from './dto/create-queue.dto';
import { QueryQueueDto } from './dto/query-queue.dto';
import { NextQueueDto } from './dto/next-queue.dto';
import { UserRole } from '../users/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ApiHttpResponse,
  ApiHttpArrayResponse,
  ApiHttpPaginatedResponse,
  ApiHttpErrorResponse,
} from '../../common/decorators/api-response.decorator';
import { generatePaginationMeta } from 'src/common/utils/pagination.util';

/**
 * REST Controller for Queue operations
 * Provides endpoints for queue management
 */
@ApiTags('queues')
@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) { }

  /**
   * Create a new queue (Admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new queue' })
  @ApiHttpResponse(201, 'Queue created successfully', Queue)
  @ApiHttpErrorResponse(400, 'Invalid input')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async createQueue(@Body() createQueueDto: CreateQueueDto) {
    return this.queuesService.create(createQueueDto);
  }

  /**
   * Get all queues with pagination
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all queues with pagination' })
  @ApiHttpPaginatedResponse(200, 'Queues retrieved successfully', Queue)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getQueues(@Query() queryDto: QueryQueueDto) {
    const { data, total } = await this.queuesService.findAll(queryDto);

    // Generate pagination meta
    const meta = generatePaginationMeta(total, queryDto);
    return { data, meta };
  }

  /**
   * Get a single queue by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get queue by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Queue retrieved successfully', Queue)
  @ApiHttpErrorResponse(404, 'Queue not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getQueue(@Param('id') id: string) {
    return this.queuesService.findOne(id);
  }

  /**
   * Get current queue for a doctor
   */
  @Get('doctor/:doctorId/current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current queue for a doctor' })
  @ApiParam({ name: 'doctorId', type: String })
  @ApiQuery({ name: 'queueDate', type: String })
  @ApiHttpResponse(200, 'Current queue retrieved successfully', Queue)
  @ApiHttpErrorResponse(404, 'Queue not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getCurrentQueue(
    @Param('doctorId') doctorId: string,
    @Query('queueDate') queueDate: string,
  ) {
    return this.queuesService.getCurrentQueue(doctorId, queueDate);
  }

  /**
   * Get all queues for a doctor on a specific date
   */
  @Get('doctor/:doctorId/date/:queueDate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all queues for a doctor on a specific date' })
  @ApiParam({ name: 'doctorId', type: String })
  @ApiParam({ name: 'queueDate', type: String })
  @ApiHttpArrayResponse(200, 'Queues retrieved successfully', Queue)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getQueuesByDoctor(
    @Param('doctorId') doctorId: string,
    @Param('queueDate') queueDate: string,
  ) {
    return this.queuesService.getQueuesByDoctor(doctorId, queueDate);
  }

  /**
   * Call next queue (Doctor only)
   */
  @Post('next')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Call next queue' })
  @ApiHttpResponse(200, 'Next queue called successfully', Queue)
  @ApiHttpErrorResponse(400, 'Invalid input')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async callNextQueue(@Body() nextQueueDto: NextQueueDto) {
    return this.queuesService.callNextQueue(nextQueueDto);
  }

  /**
   * Skip a queue (Doctor/Admin only)
   */
  @Post(':id/skip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Skip a queue' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Queue skipped successfully', Queue)
  @ApiHttpErrorResponse(404, 'Queue not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async skipQueue(@Param('id') id: string) {
    return this.queuesService.skipQueue(id);
  }

  /**
   * Bulk import queues from JSON file
   */
  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Bulk import queues from JSON file',
    description: 'Import multiple queues from a JSON file. File should contain: { "queues": [{ "patientEmail": "patient@email.com", "doctorEmail": "doctor@clinic.com", "queueNumber": 1, "queueDate": "2025-08-15", "status": "waiting" }] }',
  })
  @ApiBody({
    description: 'JSON file containing queues array',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'JSON file with queues data',
        },
      },
      required: ['file'],
    },
  })
  @ApiHttpResponse(200, 'Queues imported successfully')
  @ApiHttpErrorResponse(400, 'Invalid file format')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async importQueues(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      const importData = JSON.parse(file.buffer.toString('utf-8'));
      const queues = importData.queues || [];
      const result = await this.queuesService.bulkImport(queues);
      return {
        message: 'Import completed',
        ...result,
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error.message}`);
    }
  }
}
