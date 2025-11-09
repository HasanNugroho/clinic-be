import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { Registration } from './schemas/registration.schema';
import { User, UserRole } from '../users/schemas/user.schema';
import { DoctorSchedule } from '../doctorSchedules/schemas/doctor-schedule.schema';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { DataLoaderFactory } from 'src/common/service/data-loader-factory.service';
import DataLoader from 'dataloader';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { GqlRolesGuard } from '../auth/guards/gql-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * GraphQL Resolver for Registration operations
 * Provides queries and mutations for registration management
 */
@Resolver(() => Registration)
export class RegistrationsResolver {
    private registrationLoader: DataLoader<any, any>;
    private userLoader: DataLoader<any, any>;
    private doctorScheduleLoader: DataLoader<any, any>;

    constructor(
        private readonly registrationsService: RegistrationsService,
        private readonly dataLoaderFactory: DataLoaderFactory,
    ) {
        // Initialize DataLoaders
        const loaders = this.dataLoaderFactory.createLoaders({
            Registration: {
                key: '_id',
                cache: true,
            },
            User: {
                key: '_id',
                cache: true,
            },
            DoctorSchedule: {
                key: '_id',
                cache: true,
            },
        });
        this.registrationLoader = loaders.registrationLoader!;
        this.userLoader = loaders.userLoader!;
        this.doctorScheduleLoader = loaders.doctorScheduleLoader!;
    }

    /**
     * Query to get all registrations (Employee, Doctor, Superadmin)
     */
    @Query(() => [Registration], { name: 'registrations', description: 'Get all registrations' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    async getRegistrations() {
        const result = await this.registrationsService.findAll({});
        return result.data;
    }

    /**
     * Query to get a single registration by ID (Patient, Employee, Doctor, Superadmin)
     */
    @Query(() => Registration, { name: 'registration', description: 'Get registration by ID', nullable: true })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.PATIENT, UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    async getRegistration(@Args('id', { type: () => ID }) id: string) {
        return this.registrationLoader.load(id);
    }

    /**
     * Query to get registrations by patient ID (Patient, Employee, Doctor, Superadmin)
     */
    @Query(() => [Registration], { name: 'registrationsByPatient', description: 'Get registrations by patient ID' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.PATIENT, UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    async getRegistrationsByPatient(@Args('patientId', { type: () => ID }) patientId: string) {
        return this.registrationsService.findByPatientId(patientId);
    }

    /**
     * Query to get registrations by doctor ID (Employee, Doctor, Superadmin)
     */
    @Query(() => [Registration], { name: 'registrationsByDoctor', description: 'Get registrations by doctor ID' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    async getRegistrationsByDoctor(@Args('doctorId', { type: () => ID }) doctorId: string) {
        return this.registrationsService.findByDoctorId(doctorId);
    }

    /**
     * Mutation to create a new registration (Patient, Employee, Superadmin)
     */
    @Mutation(() => Registration, { name: 'createRegistration', description: 'Create a new registration' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.PATIENT, UserRole.EMPLOYEE, UserRole.SUPERADMIN)
    async createRegistration(@Args('input') createDto: CreateRegistrationDto) {
        const registration = await this.registrationsService.create(createDto);
        this.registrationLoader.clear(registration._id).prime(registration._id, registration);
        return registration;
    }

    /**
     * Mutation to update a registration (Employee, Doctor, Superadmin)
     */
    @Mutation(() => Registration, { name: 'updateRegistration', description: 'Update an existing registration' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    async updateRegistration(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') updateDto: UpdateRegistrationDto,
    ) {
        const registration = await this.registrationsService.update(id, updateDto);
        this.registrationLoader.clear(id).prime(id, registration);
        return registration;
    }

    /**
     * Mutation to delete a registration (Employee, Superadmin)
     */
    @Mutation(() => Boolean, { name: 'deleteRegistration', description: 'Delete a registration' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.EMPLOYEE, UserRole.SUPERADMIN)
    async deleteRegistration(@Args('id', { type: () => ID }) id: string) {
        await this.registrationsService.remove(id);
        this.registrationLoader.clear(id);
        return true;
    }

    /**
     * Field resolver to get the patient information
     */
    @ResolveField(() => User, { name: 'patient', description: 'Get patient information', nullable: true })
    async getPatient(@Parent() registration: Registration) {
        return this.userLoader.load(registration.patientId);
    }

    /**
     * Field resolver to get the doctor information
     */
    @ResolveField(() => User, { name: 'doctor', description: 'Get doctor information', nullable: true })
    async getDoctor(@Parent() registration: Registration) {
        return this.userLoader.load(registration.doctorId);
    }

    /**
     * Field resolver to get the schedule information
     */
    @ResolveField(() => DoctorSchedule, { name: 'schedule', description: 'Get schedule information', nullable: true })
    async getSchedule(@Parent() registration: Registration) {
        return this.doctorScheduleLoader.load(registration.scheduleId);
    }
}
