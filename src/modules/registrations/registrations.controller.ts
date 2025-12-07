import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { RegistrationsService } from './registrations.service';
import { Registration } from './schemas/registration.schema';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { CheckinRegistrationDto } from './dto/checkin-registration.dto';
import { UserRole } from '../users/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiHttpResponse,
  ApiHttpArrayResponse,
  ApiHttpPaginatedResponse,
  ApiHttpErrorResponse,
} from '../../common/decorators/api-response.decorator';
import { QueryRegistrationDto } from './dto/query-registration.dto';
import { generatePaginationMeta } from 'src/common/utils/pagination.util';

/**
 * REST Controller for Registration operations
 * Provides endpoints for registration management
 */
@ApiTags('registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) { }

  /**
   * Get all registrations (Admin, Doctor)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all registrations' })
  @ApiHttpPaginatedResponse(200, 'Registrations retrieved successfully', Registration)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async getRegistrations(@Query() queryDto: QueryRegistrationDto) {
    const { data, total } = await this.registrationsService.findAll(queryDto);

    // Generate pagination meta
    const meta = generatePaginationMeta(total, queryDto);
    return { data, meta };
  }

  /**
   * Get a single registration by ID (Patient, Admin, Doctor)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get registration by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Registration retrieved successfully', Registration)
  @ApiHttpErrorResponse(404, 'Registration not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getRegistration(@Param('id') id: string) {
    return this.registrationsService.findOne(id);
  }

  /**
   * Get registrations by patient ID (Patient, Admin, Doctor)
   */
  @Get('patient/:patientId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get registrations by patient ID' })
  @ApiParam({ name: 'patientId', type: String })
  @ApiHttpArrayResponse(200, 'Registrations retrieved successfully', Registration)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getRegistrationsByPatient(@Param('patientId') patientId: string) {
    return this.registrationsService.findByPatientId(patientId);
  }

  /**
   * Get registrations by doctor ID (Admin, Doctor)
   */
  @Get('doctor/:doctorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get registrations by doctor ID' })
  @ApiParam({ name: 'doctorId', type: String })
  @ApiHttpArrayResponse(200, 'Registrations retrieved successfully', Registration)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getRegistrationsByDoctor(@Param('doctorId') doctorId: string) {
    return this.registrationsService.findByDoctorId(doctorId);
  }

  /**
   * Create a new registration (Patient, Admin)
   * 
   * Quota limit is enforced only for non-admin users
   * Admin users can create registrations beyond quota limits
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new registration',
    description: 'Create registration for patient. Non-admin users respect doctor schedule quota. Admin users can create registrations beyond quota limits.',
  })
  @ApiHttpResponse(201, 'Registration created successfully', Registration)
  @ApiHttpErrorResponse(400, 'Invalid input')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  @ApiHttpErrorResponse(409, 'Patient already has active registration or quota full (non-admin only)')
  async createRegistration(@Body() createDto: CreateRegistrationDto, @CurrentUser() user: any): Promise<Registration> {
    return await this.registrationsService.create(createDto, user);
  }

  /**
   * Update a registration (Admin, Doctor)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an existing registration' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Registration updated successfully', Registration)
  @ApiHttpErrorResponse(404, 'Registration not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async updateRegistration(@Param('id') id: string, @Body() updateDto: UpdateRegistrationDto) {
    return await this.registrationsService.update(id, updateDto);
  }

  /**
   * Delete a registration (Admin)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a registration' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Registration deleted successfully', Registration)
  @ApiHttpErrorResponse(404, 'Registration not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async deleteRegistration(@Param('id') id: string) {
    await this.registrationsService.remove(id);
    return { message: 'Registration deleted successfully' };
  }

  /**
   * Bulk import registrations from JSON file
   */
  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Bulk import registrations from JSON file',
    description: 'Import multiple registrations from a JSON file. File should contain: { "registrations": [{ "patientEmail": "patient@email.com", "doctorEmail": "doctor@clinic.com", "registrationDate": "2025-08-15T09:00:00Z", "registrationMethod": "online", "queueNumber": 1 }] }',
  })
  @ApiBody({
    description: 'JSON file containing registrations array',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'JSON file with registrations data',
        },
      },
      required: ['file'],
    },
  })
  @ApiHttpResponse(200, 'Registrations imported successfully')
  @ApiHttpErrorResponse(400, 'Invalid file format')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async importRegistrations(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      const importData = JSON.parse(file.buffer.toString('utf-8'));
      const registrations = importData.registrations || [];
      const result = await this.registrationsService.bulkImport(registrations);
      return {
        message: 'Import completed',
        ...result,
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error.message}`);
    }
  }

  /**
   * Validate online registration before check-in (Patient only)
   */
  @Post(':id/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Validate registration for check-in',
    description: 'Validate that an online registration is ready for check-in. Only online registrations in waiting status can be checked in.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Registration is valid for check-in', Registration)
  @ApiHttpErrorResponse(400, 'Registration is not valid for check-in')
  @ApiHttpErrorResponse(404, 'Registration not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async validateRegistration(@Param('id') id: string): Promise<Registration> {
    return await this.registrationsService.validateRegistration(id);
  }

  /**
   * Check-in patient and generate queue number (Patient only)
   */
  @Post('checkin/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Check-in patient and generate queue number',
    description: 'Patient checks in at clinic. This generates a queue number for the online registration. Queue number is used to track patient in queue.',
  })
  @ApiHttpResponse(200, 'Check-in successful, queue number generated', Registration)
  @ApiHttpErrorResponse(400, 'Invalid check-in request')
  @ApiHttpErrorResponse(404, 'Registration not found')
  @ApiHttpErrorResponse(409, 'Patient already checked in')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async checkinRegistration(@Body() checkinDto: CheckinRegistrationDto): Promise<Registration> {
    return await this.registrationsService.checkinRegistration(checkinDto);
  }
}
