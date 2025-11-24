import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Registration, RegistrationStatus } from './schemas/registration.schema';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { QueryRegistrationDto } from './dto/query-registration.dto';
import { UsersService } from '../users/users.service';
import { DoctorSchedulesService } from '../doctorSchedules/doctor-schedules.service';
import { UserRole } from '../users/schemas/user.schema';
import { PaginatedResponse } from '../../common/dtos/pagination.dto';
import { EmbeddingService } from '../../common/services/embedding/embedding.service';

@Injectable()
export class RegistrationsService {
    constructor(
        @InjectModel(Registration.name)
        private registrationModel: Model<Registration>,
        private usersService: UsersService,
        private doctorSchedulesService: DoctorSchedulesService,
        private embeddingService: EmbeddingService,
    ) { }

    async create(createRegistrationDto: CreateRegistrationDto): Promise<Registration> {
        // Validate patient exists and has PATIENT role
        const patient = await this.usersService.findOne(createRegistrationDto.patientId);
        if (!patient || patient.role !== UserRole.PATIENT) {
            throw new BadRequestException('Invalid patient ID or user is not a patient');
        }

        // Validate doctor exists and has DOCTOR role
        const doctor = await this.usersService.findOne(createRegistrationDto.doctorId);
        if (!doctor || doctor.role !== UserRole.DOCTOR) {
            throw new BadRequestException('Invalid doctor ID or user is not a doctor');
        }

        // Validate schedule exists
        const schedule = await this.doctorSchedulesService.findOne(createRegistrationDto.scheduleId);
        if (!schedule) {
            throw new NotFoundException('Schedule not found');
        }

        // Validate schedule belongs to the doctor
        if (schedule.doctorId.toString() !== createRegistrationDto.doctorId) {
            throw new BadRequestException('Schedule does not belong to the specified doctor');
        }

        // Parse registration date
        const registrationDate = new Date(createRegistrationDto.registrationDate);
        registrationDate.setHours(0, 0, 0, 0);

        // Check if patient already has a registration for this doctor on this date
        const existingRegistration = await this.registrationModel.findOne({
            patientId: new Types.ObjectId(createRegistrationDto.patientId),
            doctorId: new Types.ObjectId(createRegistrationDto.doctorId),
            registrationDate: registrationDate,
            status: { $in: [RegistrationStatus.WAITING, RegistrationStatus.EXAMINING] }
        });

        if (existingRegistration) {
            throw new ConflictException('Patient already has an active registration with this doctor on this date');
        }

        // Generate queue number (auto-increment for the day and doctor)
        const queueNumber = await this.generateQueueNumber(
            createRegistrationDto.doctorId,
            registrationDate
        );

        // Create registration
        const createdRegistration = new this.registrationModel({
            patientId: new Types.ObjectId(createRegistrationDto.patientId),
            doctorId: new Types.ObjectId(createRegistrationDto.doctorId),
            scheduleId: new Types.ObjectId(createRegistrationDto.scheduleId),
            registrationDate: registrationDate,
            registrationMethod: createRegistrationDto.registrationMethod,
            status: RegistrationStatus.WAITING,
            queueNumber: queueNumber,
        });

        const savedRegistration = await createdRegistration.save();

        // Generate embedding asynchronously
        await this.generateAndSaveEmbedding(savedRegistration._id.toString())

        return savedRegistration;
    }

    async findAll(queryDto: QueryRegistrationDto): Promise<InstanceType<ReturnType<typeof PaginatedResponse<Registration>>>> {
        const { page = 1, limit = 10, sortBy = 'registrationDate', sortOrder = 'desc', search, status, registrationMethod, dateFrom, dateTo } = queryDto;

        // Build filter query
        const filter: any = {};

        if (status) {
            filter.status = status;
        }

        if (registrationMethod) {
            filter.registrationMethod = registrationMethod;
        }

        if (dateFrom || dateTo) {
            filter.registrationDate = {};
            if (dateFrom) {
                filter.registrationDate.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                filter.registrationDate.$lte = toDate;
            }
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        const sortOptions: any = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        // Add secondary sort by queueNumber for same dates
        if (sortBy === 'registrationDate') {
            sortOptions.queueNumber = 1;
        }

        // Execute query with pagination
        const [data, total] = await Promise.all([
            this.registrationModel
                .find(filter)
                .populate('patientId', 'fullName email phoneNumber')
                .populate('doctorId', 'fullName specialization')
                .populate('scheduleId', 'dayOfWeek startTime endTime')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .exec(),
            this.registrationModel.countDocuments(filter).exec(),
        ]);

        const PaginatedRegistrationResponse = PaginatedResponse(Registration);
        return new PaginatedRegistrationResponse(data, total, page, limit);
    }

    async findOne(id: string): Promise<Registration> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid registration ID');
        }

        const registration = await this.registrationModel
            .findById(id)
            .populate('patientId', 'fullName email phoneNumber')
            .populate('doctorId', 'fullName specialization')
            .populate('scheduleId', 'dayOfWeek startTime endTime')
            .exec();

        if (!registration) {
            throw new NotFoundException(`Registration with ID ${id} not found`);
        }

        return registration;
    }

    async findByPatientId(patientId: string): Promise<Registration[]> {
        if (!Types.ObjectId.isValid(patientId)) {
            throw new BadRequestException('Invalid patient ID');
        }

        return this.registrationModel
            .find({ patientId: new Types.ObjectId(patientId) })
            .populate('doctorId', 'fullName specialization')
            .populate('scheduleId', 'dayOfWeek startTime endTime')
            .sort({ registrationDate: -1, queueNumber: 1 })
            .exec();
    }

    async findByDoctorId(doctorId: string, date?: string): Promise<Registration[]> {
        if (!Types.ObjectId.isValid(doctorId)) {
            throw new BadRequestException('Invalid doctor ID');
        }

        const query: any = { doctorId: new Types.ObjectId(doctorId) };

        if (date) {
            const registrationDate = new Date(date);
            registrationDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(registrationDate);
            nextDay.setDate(nextDay.getDate() + 1);

            query.registrationDate = {
                $gte: registrationDate,
                $lt: nextDay,
            };
        }

        return this.registrationModel
            .find(query)
            .populate('patientId', 'fullName email phoneNumber')
            .populate('scheduleId', 'dayOfWeek startTime endTime')
            .sort({ registrationDate: -1, queueNumber: 1 })
            .exec();
    }

    async update(id: string, updateRegistrationDto: UpdateRegistrationDto): Promise<Registration> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid registration ID');
        }

        const updatedRegistration = await this.registrationModel
            .findByIdAndUpdate(id, updateRegistrationDto, { new: true })
            .populate('patientId', 'fullName email phoneNumber')
            .populate('doctorId', 'fullName specialization')
            .populate('scheduleId', 'dayOfWeek startTime endTime')
            .exec();

        if (!updatedRegistration) {
            throw new NotFoundException(`Registration with ID ${id} not found`);
        }

        // Regenerate embedding asynchronously
        await this.generateAndSaveEmbedding(id);

        return updatedRegistration;
    }

    async remove(id: string): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid registration ID');
        }

        const result = await this.registrationModel.findByIdAndDelete(id).exec();

        if (!result) {
            throw new NotFoundException(`Registration with ID ${id} not found`);
        }
    }

    private async generateQueueNumber(doctorId: string, date: Date): Promise<number> {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const count = await this.registrationModel.countDocuments({
            doctorId: new Types.ObjectId(doctorId),
            registrationDate: {
                $gte: date,
                $lt: nextDay,
            },
        });

        return count + 1;
    }

    /**
     * Build embedding text for a registration
     * Combines registration metadata for RAG indexing
     * @param registration - Registration document with populated references
     * @returns Embedding text string
     */
    buildEmbeddingText(registration: any): string {
        const fields: Record<string, any> = {};

        // Add registration metadata
        if (registration.registrationDate) {
            fields['registration_date'] = registration.registrationDate.toISOString().split('T')[0];
        }
        if (registration.registrationMethod) {
            fields['registration_method'] = registration.registrationMethod;
        }
        if (registration.status) {
            fields['status'] = registration.status;
        }
        if (registration.queueNumber) {
            fields['queue_number'] = registration.queueNumber;
        }

        // Add doctor information (if populated)
        if (registration.doctorId && typeof registration.doctorId === 'object') {
            if (registration.doctorId.fullName) {
                fields['doctor_name'] = registration.doctorId.fullName;
            }
            if (registration.doctorId.specialization) {
                fields['doctor_specialization'] = registration.doctorId.specialization;
            }
        }

        // Add schedule information (if populated)
        if (registration.scheduleId && typeof registration.scheduleId === 'object') {
            if (registration.scheduleId.dayOfWeek) {
                fields['schedule_day'] = registration.scheduleId.dayOfWeek;
            }
            if (registration.scheduleId.startTime) {
                fields['schedule_start'] = registration.scheduleId.startTime;
            }
            if (registration.scheduleId.endTime) {
                fields['schedule_end'] = registration.scheduleId.endTime;
            }
        }

        return this.embeddingService.buildEmbeddingText(fields);
    }

    /**
     * Generate and save embedding for a registration
     * @param registrationId - ID of registration to embed
     */
    async generateAndSaveEmbedding(registrationId: string): Promise<void> {
        try {
            const registration = await this.registrationModel
                .findById(registrationId)
                .populate('doctorId', 'fullName specialization')
                .populate('scheduleId', 'dayOfWeek startTime endTime')
                .exec();

            if (!registration) {
                throw new NotFoundException(`Registration with ID ${registrationId} not found`);
            }

            const embeddingText = this.buildEmbeddingText(registration);
            const embedding = await this.embeddingService.generateEmbedding(embeddingText);

            await this.registrationModel.findByIdAndUpdate(
                registrationId,
                {
                    embedding,
                    embeddingText,
                    embeddingUpdatedAt: new Date(),
                },
            ).exec();
        } catch (error) {
            throw new Error(`Failed to generate embedding for registration ${registrationId}: ${error.message}`);
        }
    }

    /**
     * Generate embeddings for multiple registrations
     * @param registrationIds - Array of registration IDs
     */
    async generateBatchEmbeddings(registrationIds: string[]): Promise<void> {
        for (const registrationId of registrationIds) {
            try {
                await this.generateAndSaveEmbedding(registrationId);
            } catch (error) {
                console.error(`Error generating embedding for registration ${registrationId}:`, error);
            }
        }
    }
}
