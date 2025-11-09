import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Examination, ExaminationDocument } from './schemas/examination.schema';
import { CreateExaminationDto } from './dto/create-examination.dto';
import { UpdateExaminationDto } from './dto/update-examination.dto';
import { QueryExaminationDto } from './dto/query-examination.dto';
import { UsersService } from '../users/users.service';
import { RegistrationsService } from '../registrations/registrations.service';
import { UserRole } from '../users/schemas/user.schema';
import { PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class ExaminationsService {
    constructor(
        @InjectModel(Examination.name)
        private examinationModel: Model<ExaminationDocument>,
        private usersService: UsersService,
        private registrationsService: RegistrationsService,
    ) { }

    async create(createExaminationDto: CreateExaminationDto): Promise<Examination> {
        // Validate registration exists
        const registration = await this.registrationsService.findOne(createExaminationDto.registrationId);
        if (!registration) {
            throw new NotFoundException('Registration not found');
        }

        // Validate patient exists and has PATIENT role
        const patient = await this.usersService.findOne(createExaminationDto.patientId);
        if (!patient || patient.role !== UserRole.PATIENT) {
            throw new BadRequestException('Invalid patient ID or user is not a patient');
        }

        // Validate doctor exists and has DOCTOR role
        const doctor = await this.usersService.findOne(createExaminationDto.doctorId);
        if (!doctor || doctor.role !== UserRole.DOCTOR) {
            throw new BadRequestException('Invalid doctor ID or user is not a doctor');
        }

        // Validate that the registration belongs to the patient and doctor
        if (registration.patientId.toString() !== createExaminationDto.patientId) {
            throw new BadRequestException('Registration does not belong to the specified patient');
        }

        if (registration.doctorId.toString() !== createExaminationDto.doctorId) {
            throw new BadRequestException('Registration does not belong to the specified doctor');
        }

        // Parse examination date
        const examinationDate = new Date(createExaminationDto.examinationDate);

        // Create examination
        const createdExamination = new this.examinationModel({
            registrationId: new Types.ObjectId(createExaminationDto.registrationId),
            doctorId: new Types.ObjectId(createExaminationDto.doctorId),
            patientId: new Types.ObjectId(createExaminationDto.patientId),
            examinationDate: examinationDate,
            diagnosisSummary: createExaminationDto.diagnosisSummary,
            doctorNotes: createExaminationDto.doctorNotes,
            status: createExaminationDto.status,
        });

        return createdExamination.save();
    }

    async findAll(queryDto: QueryExaminationDto): Promise<InstanceType<ReturnType<typeof PaginatedResponse<Examination>>>> {
        const { page = 1, limit = 10, sortBy = 'examinationDate', sortOrder = 'desc', search, status, dateFrom, dateTo } = queryDto;

        // Build filter query
        const filter: any = {};

        if (status) {
            filter.status = status;
        }

        if (dateFrom || dateTo) {
            filter.examinationDate = {};
            if (dateFrom) {
                filter.examinationDate.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                filter.examinationDate.$lte = toDate;
            }
        }

        // Search in diagnosis summary and doctor notes
        if (search) {
            filter.$or = [
                { diagnosisSummary: { $regex: search, $options: 'i' } },
                { doctorNotes: { $regex: search, $options: 'i' } },
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        const sortOptions: any = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query with pagination
        const [data, total] = await Promise.all([
            this.examinationModel
                .find(filter)
                .populate('registrationId')
                .populate('doctorId', 'fullName specialization')
                .populate('patientId', 'fullName email phoneNumber')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .exec(),
            this.examinationModel.countDocuments(filter).exec(),
        ]);

        const PaginatedExaminationResponse = PaginatedResponse(Examination);
        return new PaginatedExaminationResponse(data, total, page, limit);
    }

    async findOne(id: string): Promise<Examination> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid examination ID');
        }

        const examination = await this.examinationModel
            .findById(id)
            .populate('registrationId')
            .populate('doctorId', 'fullName specialization')
            .populate('patientId', 'fullName email phoneNumber')
            .exec();

        if (!examination) {
            throw new NotFoundException(`Examination with ID ${id} not found`);
        }

        return examination;
    }

    async findByPatientId(patientId: string): Promise<Examination[]> {
        if (!Types.ObjectId.isValid(patientId)) {
            throw new BadRequestException('Invalid patient ID');
        }

        return this.examinationModel
            .find({ patientId: new Types.ObjectId(patientId) })
            .populate('registrationId')
            .populate('doctorId', 'fullName specialization')
            .sort({ examinationDate: -1 })
            .exec();
    }

    async findByDoctorId(doctorId: string, date?: string): Promise<Examination[]> {
        if (!Types.ObjectId.isValid(doctorId)) {
            throw new BadRequestException('Invalid doctor ID');
        }

        const query: any = { doctorId: new Types.ObjectId(doctorId) };

        if (date) {
            const examinationDate = new Date(date);
            examinationDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(examinationDate);
            nextDay.setDate(nextDay.getDate() + 1);

            query.examinationDate = {
                $gte: examinationDate,
                $lt: nextDay,
            };
        }

        return this.examinationModel
            .find(query)
            .populate('registrationId')
            .populate('patientId', 'fullName email phoneNumber')
            .sort({ examinationDate: -1 })
            .exec();
    }

    async findByRegistrationId(registrationId: string): Promise<Examination[]> {
        if (!Types.ObjectId.isValid(registrationId)) {
            throw new BadRequestException('Invalid registration ID');
        }

        return this.examinationModel
            .find({ registrationId: new Types.ObjectId(registrationId) })
            .populate('doctorId', 'fullName specialization')
            .populate('patientId', 'fullName email phoneNumber')
            .sort({ examinationDate: -1 })
            .exec();
    }

    async update(id: string, updateExaminationDto: UpdateExaminationDto): Promise<Examination> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid examination ID');
        }

        const updateData: any = { ...updateExaminationDto };
        
        if (updateExaminationDto.examinationDate) {
            updateData.examinationDate = new Date(updateExaminationDto.examinationDate);
        }

        const updatedExamination = await this.examinationModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .populate('registrationId')
            .populate('doctorId', 'fullName specialization')
            .populate('patientId', 'fullName email phoneNumber')
            .exec();

        if (!updatedExamination) {
            throw new NotFoundException(`Examination with ID ${id} not found`);
        }

        return updatedExamination;
    }

    async remove(id: string): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid examination ID');
        }

        const result = await this.examinationModel.findByIdAndDelete(id).exec();

        if (!result) {
            throw new NotFoundException(`Examination with ID ${id} not found`);
        }
    }
}
