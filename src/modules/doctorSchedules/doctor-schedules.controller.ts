import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DoctorSchedulesService } from './doctor-schedules.service';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';
import { HttpResponse } from '../../common/dto/http-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Doctor Schedules')
@Controller('doctor-schedules')
export class DoctorSchedulesController {
    constructor(private readonly doctorSchedulesService: DoctorSchedulesService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new doctor schedule (Admin & Employee only)' })
    @ApiResponse({ status: 201, description: 'Schedule created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async create(@Body() createDoctorScheduleDto: CreateDoctorScheduleDto) {
        const schedule = await this.doctorSchedulesService.create(createDoctorScheduleDto);
        return new HttpResponse(HttpStatus.CREATED, true, 'Doctor schedule created successfully', schedule);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all doctor schedules (All authenticated users)' })
    @ApiResponse({ status: 200, description: 'Return all schedules' })
    async findAll() {
        const schedules = await this.doctorSchedulesService.findAll();
        return new HttpResponse(HttpStatus.OK, true, 'Doctor schedules retrieved successfully', schedules);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get a doctor schedule by ID (All authenticated users)' })
    @ApiResponse({ status: 200, description: 'Return the schedule' })
    @ApiResponse({ status: 404, description: 'Schedule not found' })
    async findOne(@Param('id') id: string) {
        const schedule = await this.doctorSchedulesService.findOne(id);
        return new HttpResponse(HttpStatus.OK, true, 'Doctor schedule retrieved successfully', schedule);
    }

    @Get('doctor/:doctorId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all schedules for a specific doctor (All authenticated users)' })
    @ApiResponse({ status: 200, description: 'Return doctor schedules' })
    async findByDoctor(@Param('doctorId') doctorId: string) {
        const schedules = await this.doctorSchedulesService.findByDoctorId(doctorId);
        return new HttpResponse(HttpStatus.OK, true, 'Doctor schedules retrieved successfully', schedules);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update a doctor schedule (Admin & Employee only)' })
    @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
    @ApiResponse({ status: 404, description: 'Schedule not found' })
    async update(@Param('id') id: string, @Body() updateDoctorScheduleDto: UpdateDoctorScheduleDto) {
        const schedule = await this.doctorSchedulesService.update(id, updateDoctorScheduleDto);
        return new HttpResponse(HttpStatus.OK, true, 'Doctor schedule updated successfully', schedule);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a doctor schedule (Admin & Employee only)' })
    @ApiResponse({ status: 200, description: 'Schedule deleted successfully' })
    @ApiResponse({ status: 404, description: 'Schedule not found' })
    async remove(@Param('id') id: string) {
        await this.doctorSchedulesService.remove(id);
        return new HttpResponse(HttpStatus.OK, true, 'Doctor schedule deleted successfully', null);
    }
}