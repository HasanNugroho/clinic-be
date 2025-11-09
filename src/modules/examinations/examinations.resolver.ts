import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ExaminationsService } from './examinations.service';
import { Examination } from './schemas/examination.schema';
import { User, UserRole } from '../users/schemas/user.schema';
import { Registration } from '../registrations/schemas/registration.schema';
import { CreateExaminationDto } from './dto/create-examination.dto';
import { UpdateExaminationDto } from './dto/update-examination.dto';
import { DataLoaderFactory } from 'src/common/service/data-loader-factory.service';
import DataLoader from 'dataloader';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { GqlRolesGuard } from '../auth/guards/gql-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * GraphQL Resolver for Examination operations
 * Provides queries and mutations for examination management
 */
@Resolver(() => Examination)
export class ExaminationsResolver {
    private examinationLoader: DataLoader<any, any>;
    private userLoader: DataLoader<any, any>;
    private registrationLoader: DataLoader<any, any>;

    constructor(
        private readonly examinationsService: ExaminationsService,
        private readonly dataLoaderFactory: DataLoaderFactory,
    ) {
        // Initialize DataLoaders
        const loaders = this.dataLoaderFactory.createLoaders({
            Examination: {
                key: '_id',
                cache: true,
            },
            User: {
                key: '_id',
                cache: true,
            },
            Registration: {
                key: '_id',
                cache: true,
            },
        });
        this.examinationLoader = loaders.examinationLoader!;
        this.userLoader = loaders.userLoader!;
        this.registrationLoader = loaders.registrationLoader!;
    }

    /**
     * Query to get all examinations (Employee, Doctor, Superadmin)
     */
    @Query(() => [Examination], { name: 'examinations', description: 'Get all examinations' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    async getExaminations() {
        const result = await this.examinationsService.findAll({});
        return result.data;
    }

    /**
     * Query to get a single examination by ID (Patient, Employee, Doctor, Superadmin)
     */
    @Query(() => Examination, { name: 'examination', description: 'Get examination by ID', nullable: true })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.PATIENT, UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    async getExamination(@Args('id', { type: () => ID }) id: string) {
        return this.examinationLoader.load(id);
    }

    /**
     * Query to get examinations by patient ID (Patient, Employee, Doctor, Superadmin)
     */
    @Query(() => [Examination], { name: 'examinationsByPatient', description: 'Get examinations by patient ID' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.PATIENT, UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    async getExaminationsByPatient(@Args('patientId', { type: () => ID }) patientId: string) {
        return this.examinationsService.findByPatientId(patientId);
    }

    /**
     * Query to get examinations by doctor ID (Employee, Doctor, Superadmin)
     */
    @Query(() => [Examination], { name: 'examinationsByDoctor', description: 'Get examinations by doctor ID' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.EMPLOYEE, UserRole.DOCTOR, UserRole.SUPERADMIN)
    async getExaminationsByDoctor(@Args('doctorId', { type: () => ID }) doctorId: string) {
        return this.examinationsService.findByDoctorId(doctorId);
    }

    /**
     * Mutation to create a new examination (Doctor, Superadmin)
     */
    @Mutation(() => Examination, { name: 'createExamination', description: 'Create a new examination' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.DOCTOR, UserRole.SUPERADMIN)
    async createExamination(@Args('input') createDto: CreateExaminationDto) {
        const examination = await this.examinationsService.create(createDto);
        this.examinationLoader.clear(examination._id).prime(examination._id, examination);
        return examination;
    }

    /**
     * Mutation to update an examination (Doctor, Superadmin)
     */
    @Mutation(() => Examination, { name: 'updateExamination', description: 'Update an existing examination' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.DOCTOR, UserRole.SUPERADMIN)
    async updateExamination(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') updateDto: UpdateExaminationDto,
    ) {
        const examination = await this.examinationsService.update(id, updateDto);
        this.examinationLoader.clear(id).prime(id, examination);
        return examination;
    }

    /**
     * Mutation to delete an examination (Superadmin only)
     */
    @Mutation(() => Boolean, { name: 'deleteExamination', description: 'Delete an examination' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.SUPERADMIN)
    async deleteExamination(@Args('id', { type: () => ID }) id: string) {
        await this.examinationsService.remove(id);
        this.examinationLoader.clear(id);
        return true;
    }

    /**
     * Field resolver to get the patient information
     */
    @ResolveField(() => User, { name: 'patient', description: 'Get patient information', nullable: true })
    async getPatient(@Parent() examination: Examination) {
        return this.userLoader.load(examination.patientId);
    }

    /**
     * Field resolver to get the doctor information
     */
    @ResolveField(() => User, { name: 'doctor', description: 'Get doctor information', nullable: true })
    async getDoctor(@Parent() examination: Examination) {
        return this.userLoader.load(examination.doctorId);
    }

    /**
     * Field resolver to get the registration information
     */
    @ResolveField(() => Registration, { name: 'registration', description: 'Get registration information', nullable: true })
    async getRegistration(@Parent() examination: Examination) {
        return this.registrationLoader.load(examination.registrationId);
    }
}
