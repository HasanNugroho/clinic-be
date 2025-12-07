import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { Registration } from './schemas/registration.schema';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
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
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new registration' })
  @ApiHttpResponse(201, 'Registration created successfully', Registration)
  @ApiHttpErrorResponse(400, 'Invalid input')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async createRegistration(@Body() createDto: CreateRegistrationDto): Promise<Registration> {
    return await this.registrationsService.create(createDto);
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
   * Bulk import registrations from JSON
   */
  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Bulk import registrations from JSON',
    description: 'Import multiple registrations. Sample: { "registrations": [{ "patientEmail": "patient@email.com", "doctorEmail": "doctor@clinic.com", "registrationDate": "2025-08-15T09:00:00Z", "registrationMethod": "online", "queueNumber": 1 }] }',
  })
  @ApiHttpResponse(200, 'Registrations imported successfully')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async importRegistrations(@Body() importData: any) {
    const registrations = importData.registrations || [];
    const result = await this.registrationsService.bulkImport(registrations);
    return {
      message: 'Import completed',
      ...result,
    };
  }
}
