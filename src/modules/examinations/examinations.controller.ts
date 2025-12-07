import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExaminationsService } from './examinations.service';
import { Examination } from './schemas/examination.schema';
import { CreateExaminationDto } from './dto/create-examination.dto';
import { UpdateExaminationDto } from './dto/update-examination.dto';
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
import { QueryExaminationDto } from './dto/query-examination.dto';
import { generatePaginationMeta } from 'src/common/utils/pagination.util';

/**
 * REST Controller for Examination operations
 * Provides endpoints for examination management
 */
@ApiTags('examinations')
@Controller('examinations')
export class ExaminationsController {
  constructor(private readonly examinationsService: ExaminationsService) { }

  /**
   * Get all examinations (Admin, Doctor)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all examinations' })
  @ApiHttpPaginatedResponse(200, 'Examinations retrieved successfully', Examination)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async getExaminations(@Query() queryDto: QueryExaminationDto) {
    const { data, total } = await this.examinationsService.findAll(queryDto);

    // Generate pagination meta
    const meta = generatePaginationMeta(total, queryDto);
    return { data, meta };
  }

  /**
   * Get a single examination by ID (Patient, Admin, Doctor)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get examination by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Examination retrieved successfully', Examination)
  @ApiHttpErrorResponse(404, 'Examination not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getExamination(@Param('id') id: string) {
    return this.examinationsService.findOne(id);
  }

  /**
   * Get examinations by patient ID (Patient, Admin, Doctor)
   */
  @Get('patient/:patientId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get examinations by patient ID' })
  @ApiParam({ name: 'patientId', type: String })
  @ApiHttpArrayResponse(200, 'Examinations retrieved successfully', Examination)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getExaminationsByPatient(@Param('patientId') patientId: string) {
    return this.examinationsService.findByPatientId(patientId);
  }

  /**
   * Get examinations by doctor ID (Admin, Doctor)
   */
  @Get('doctor/:doctorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get examinations by doctor ID' })
  @ApiParam({ name: 'doctorId', type: String })
  @ApiHttpArrayResponse(200, 'Examinations retrieved successfully', Examination)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getExaminationsByDoctor(@Param('doctorId') doctorId: string) {
    return this.examinationsService.findByDoctorId(doctorId);
  }

  /**
   * Create a new examination (Doctor, Admin)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new examination' })
  @ApiHttpResponse(201, 'Examination created successfully', Examination)
  @ApiHttpErrorResponse(400, 'Invalid input')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async createExamination(@Body() createDto: CreateExaminationDto) {
    return await this.examinationsService.create(createDto);
  }

  /**
   * Update an examination (Doctor, Admin)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an existing examination' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Examination updated successfully', Examination)
  @ApiHttpErrorResponse(404, 'Examination not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async updateExamination(@Param('id') id: string, @Body() updateDto: UpdateExaminationDto) {
    return await this.examinationsService.update(id, updateDto);
  }

  /**
   * Delete an examination (Admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete an examination' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Examination deleted successfully', Examination)
  @ApiHttpErrorResponse(404, 'Examination not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async deleteExamination(@Param('id') id: string) {
    await this.examinationsService.remove(id);
    return { message: 'Examination deleted successfully' };
  }

  /**
   * Bulk import examinations from JSON file
   */
  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Bulk import examinations from JSON file',
    description: 'Import multiple examinations from a JSON file. File should contain: { "examinations": [{ "patientEmail": "patient@email.com", "doctorEmail": "doctor@clinic.com", "examinationDate": "2025-08-15T10:00:00Z", "diagnosisSummary": "Hypertension", "doctorNotes": "Patient advised...", "status": "completed" }] }',
  })
  @ApiBody({
    description: 'JSON file containing examinations array',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'JSON file with examinations data',
        },
      },
      required: ['file'],
    },
  })
  @ApiHttpResponse(200, 'Examinations imported successfully')
  @ApiHttpErrorResponse(400, 'Invalid file format')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async importExaminations(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      const importData = JSON.parse(file.buffer.toString('utf-8'));
      const examinations = importData.examinations || [];
      const result = await this.examinationsService.bulkImport(examinations);
      return {
        message: 'Import completed',
        ...result,
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error.message}`);
    }
  }
}
