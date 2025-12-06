import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DoctorSchedulesService } from './doctor-schedules.service';
import { DoctorSchedule } from './schemas/doctor-schedule.schema';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';
import { QueryDoctorScheduleDto } from './dto/query-doctor-schedule.dto';
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
import { generatePaginationMeta } from '../../common/utils/pagination.util';

/**
 * REST Controller for DoctorSchedule operations
 * Provides endpoints for doctor schedule management
 */
@ApiTags('doctor-schedules')
@Controller('doctor-schedules')
export class DoctorSchedulesController {
  constructor(private readonly doctorSchedulesService: DoctorSchedulesService) { }

  /**
   * Get all doctor schedules (All authenticated users)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all doctor schedules' })
  @ApiHttpPaginatedResponse(200, 'Doctor schedules retrieved successfully', DoctorSchedule)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getDoctorSchedules(@Query() queryDto: QueryDoctorScheduleDto) {
    const { data, total } = await this.doctorSchedulesService.findAll(queryDto);

    // Generate pagination meta
    const meta = generatePaginationMeta(total, queryDto);
    return { data: data, meta };
  }

  /**
   * Get a single doctor schedule by ID (All authenticated users)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get doctor schedule by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Doctor schedule retrieved successfully', DoctorSchedule)
  @ApiHttpErrorResponse(404, 'Doctor schedule not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getDoctorSchedule(@Param('id') id: string) {
    return this.doctorSchedulesService.findOne(id);
  }

  /**
   * Get schedules by doctor ID (All authenticated users)
   */
  @Get('doctor/:doctorId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get schedules by doctor ID' })
  @ApiParam({ name: 'doctorId', type: String })
  @ApiHttpArrayResponse(200, 'Doctor schedules retrieved successfully', DoctorSchedule)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getDoctorSchedulesByDoctor(@Param('doctorId') doctorId: string) {
    return this.doctorSchedulesService.findByDoctorId(doctorId);
  }

  /**
   * Create a new doctor schedule (Admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new doctor schedule' })
  @ApiHttpResponse(201, 'Doctor schedule created successfully', DoctorSchedule)
  @ApiHttpErrorResponse(400, 'Invalid input')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async createDoctorSchedule(@Body() createDto: CreateDoctorScheduleDto) {
    return await this.doctorSchedulesService.create(createDto);
  }

  /**
   * Update a doctor schedule (Admin only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an existing doctor schedule' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Doctor schedule updated successfully', DoctorSchedule)
  @ApiHttpErrorResponse(404, 'Doctor schedule not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async updateDoctorSchedule(@Param('id') id: string, @Body() updateDto: UpdateDoctorScheduleDto) {
    return await this.doctorSchedulesService.update(id, updateDto);
  }

  /**
   * Delete a doctor schedule (Admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a doctor schedule' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'Doctor schedule deleted successfully', DoctorSchedule)
  @ApiHttpErrorResponse(404, 'Doctor schedule not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async deleteDoctorSchedule(@Param('id') id: string) {
    await this.doctorSchedulesService.remove(id);
    return { message: 'Doctor schedule deleted successfully' };
  }
}
