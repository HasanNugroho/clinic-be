import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DoctorSchedulesService } from './doctor-schedules.service';
import { DoctorSchedule } from './schemas/doctor-schedule.schema';
import { User, UserRole } from '../users/schemas/user.schema';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';
import { DataLoaderFactory } from 'src/common/service/data-loader-factory.service';
import DataLoader from 'dataloader';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { GqlRolesGuard } from '../auth/guards/gql-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * GraphQL Resolver for DoctorSchedule operations
 * Provides queries and mutations for doctor schedule management
 */
@Resolver(() => DoctorSchedule)
export class DoctorSchedulesResolver {
    private doctorScheduleLoader: DataLoader<any, any>;
    private userLoader: DataLoader<any, any>;

    constructor(
        private readonly doctorSchedulesService: DoctorSchedulesService,
        private readonly dataLoaderFactory: DataLoaderFactory,
    ) {
        // Initialize DataLoaders
        const loaders = this.dataLoaderFactory.createLoaders({
            DoctorSchedule: {
                key: '_id',
                cache: true,
            },
            User: {
                key: '_id',
                cache: true,
            },
        });
        this.doctorScheduleLoader = loaders.doctorScheduleLoader!;
        this.userLoader = loaders.userLoader!;
    }

    /**
     * Query to get all doctor schedules (All authenticated users)
     */
    @Query(() => [DoctorSchedule], { name: 'doctorSchedules', description: 'Get all doctor schedules' })
    @UseGuards(GqlAuthGuard)
    async getDoctorSchedules() {
        const result = await this.doctorSchedulesService.findAll({});
        return result.data;
    }

    /**
     * Query to get a single doctor schedule by ID (All authenticated users)
     */
    @Query(() => DoctorSchedule, { name: 'doctorSchedule', description: 'Get doctor schedule by ID', nullable: true })
    @UseGuards(GqlAuthGuard)
    async getDoctorSchedule(@Args('id', { type: () => ID }) id: string) {
        return this.doctorScheduleLoader.load(id);
    }

    /**
     * Query to get schedules by doctor ID (All authenticated users)
     */
    @Query(() => [DoctorSchedule], { name: 'doctorSchedulesByDoctor', description: 'Get schedules by doctor ID' })
    @UseGuards(GqlAuthGuard)
    async getDoctorSchedulesByDoctor(@Args('doctorId', { type: () => ID }) doctorId: string) {
        return this.doctorSchedulesService.findByDoctorId(doctorId);
    }

    /**
     * Mutation to create a new doctor schedule (Admin & Employee only)
     */
    @Mutation(() => DoctorSchedule, { name: 'createDoctorSchedule', description: 'Create a new doctor schedule' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
    async createDoctorSchedule(@Args('input') createDto: CreateDoctorScheduleDto) {
        const schedule = await this.doctorSchedulesService.create(createDto);
        this.doctorScheduleLoader.clear(schedule._id).prime(schedule._id, schedule);
        return schedule;
    }

    /**
     * Mutation to update a doctor schedule (Admin & Employee only)
     */
    @Mutation(() => DoctorSchedule, { name: 'updateDoctorSchedule', description: 'Update an existing doctor schedule' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
    async updateDoctorSchedule(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') updateDto: UpdateDoctorScheduleDto,
    ) {
        const schedule = await this.doctorSchedulesService.update(id, updateDto);
        this.doctorScheduleLoader.clear(id).prime(id, schedule);
        return schedule;
    }

    /**
     * Mutation to delete a doctor schedule (Admin & Employee only)
     */
    @Mutation(() => Boolean, { name: 'deleteDoctorSchedule', description: 'Delete a doctor schedule' })
    @UseGuards(GqlAuthGuard, GqlRolesGuard)
    @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
    async deleteDoctorSchedule(@Args('id', { type: () => ID }) id: string) {
        await this.doctorSchedulesService.remove(id);
        this.doctorScheduleLoader.clear(id);
        return true;
    }

    /**
     * Field resolver to get the doctor information
     */
    @ResolveField(() => User, { name: 'doctor', description: 'Get doctor information', nullable: true })
    async getDoctor(@Parent() schedule: DoctorSchedule) {
        return this.userLoader.load(schedule.doctorId);
    }
}
