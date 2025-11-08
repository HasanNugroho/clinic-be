import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    HttpStatus,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { HttpResponse } from '../../common/dto/http-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('registrations')
@Controller('registrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RegistrationsController {
    constructor(private readonly registrationsService: RegistrationsService) { }

    @Post()
    @Roles(UserRole.PATIENT, UserRole.EMPLOYEE, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Create a new registration' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Registration created successfully',
        type: RegistrationResponseDto,
    })
    async create(
        @Body() createRegistrationDto: CreateRegistrationDto,
    ): Promise<HttpResponse<RegistrationResponseDto>> {
        const registration = await this.registrationsService.create(createRegistrationDto);
        return new HttpResponse(
            HttpStatus.CREATED,
            true,
            'Registration created successfully',
            registration as any,
        );
    }

    @Get()
    @Roles(UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Get all registrations' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Registrations retrieved successfully',
        type: [RegistrationResponseDto],
    })
    async findAll(): Promise<HttpResponse<RegistrationResponseDto[]>> {
        const registrations = await this.registrationsService.findAll();
        return new HttpResponse(
            HttpStatus.OK,
            true,
            'Registrations retrieved successfully',
            registrations as any,
        );
    }

    @Get('patient/:patientId')
    @Roles(UserRole.PATIENT, UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Get registrations by patient ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Patient registrations retrieved successfully',
        type: [RegistrationResponseDto],
    })
    async findByPatientId(
        @Param('patientId') patientId: string,
    ): Promise<HttpResponse<RegistrationResponseDto[]>> {
        const registrations = await this.registrationsService.findByPatientId(patientId);
        return new HttpResponse(
            HttpStatus.OK,
            true,
            'Patient registrations retrieved successfully',
            registrations as any,
        );
    }

    @Get('doctor/:doctorId')
    @Roles(UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Get registrations by doctor ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Doctor registrations retrieved successfully',
        type: [RegistrationResponseDto],
    })
    async findByDoctorId(
        @Param('doctorId') doctorId: string,
        @Query('date') date?: string,
    ): Promise<HttpResponse<RegistrationResponseDto[]>> {
        const registrations = await this.registrationsService.findByDoctorId(doctorId, date);
        return new HttpResponse(
            HttpStatus.OK,
            true,
            'Doctor registrations retrieved successfully',
            registrations as any,
        );
    }

    @Get(':id')
    @Roles(UserRole.PATIENT, UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Get registration by ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Registration retrieved successfully',
        type: RegistrationResponseDto,
    })
    async findOne(@Param('id') id: string): Promise<HttpResponse<RegistrationResponseDto>> {
        const registration = await this.registrationsService.findOne(id);
        return new HttpResponse(
            HttpStatus.OK,
            true,
            'Registration retrieved successfully',
            registration as any,
        );
    }

    @Patch(':id')
    @Roles(UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Update registration status' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Registration updated successfully',
        type: RegistrationResponseDto,
    })
    async update(
        @Param('id') id: string,
        @Body() updateRegistrationDto: UpdateRegistrationDto,
    ): Promise<HttpResponse<RegistrationResponseDto>> {
        const registration = await this.registrationsService.update(id, updateRegistrationDto);
        return new HttpResponse(
            HttpStatus.OK,
            true,
            'Registration updated successfully',
            registration as any,
        );
    }

    @Delete(':id')
    @Roles(UserRole.EMPLOYEE, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Delete registration' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Registration deleted successfully',
    })
    async remove(@Param('id') id: string): Promise<HttpResponse<null>> {
        await this.registrationsService.remove(id);
        return new HttpResponse(
            HttpStatus.OK,
            true,
            'Registration deleted successfully',
        );
    }
}
