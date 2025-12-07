import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Registration, RegistrationStatus } from './schemas/registration.schema';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { QueryRegistrationDto } from './dto/query-registration.dto';
import { UsersService } from '../users/users.service';
import { DoctorSchedulesService } from '../doctorSchedules/doctor-schedules.service';
import { UserRole } from '../users/schemas/user.schema';
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
    const patient = await this.usersService.findOne(createRegistrationDto.patientId);
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new BadRequestException('Invalid patient ID or user is not a patient');
    }

    const doctor = await this.usersService.findOne(createRegistrationDto.doctorId);
    if (!doctor || doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException('Invalid doctor ID or user is not a doctor');
    }

    const schedule = await this.doctorSchedulesService.findOne(createRegistrationDto.scheduleId);
    if (!schedule) throw new NotFoundException('Schedule not found');

    if (schedule.doctorId.toString() !== createRegistrationDto.doctorId) {
      throw new BadRequestException('Schedule does not belong to the specified doctor');
    }

    const registrationDate = new Date(createRegistrationDto.registrationDate);
    registrationDate.setHours(0, 0, 0, 0);

    const existingRegistration = await this.registrationModel.findOne({
      patientId: new Types.ObjectId(createRegistrationDto.patientId),
      doctorId: new Types.ObjectId(createRegistrationDto.doctorId),
      registrationDate,
      status: { $in: [RegistrationStatus.WAITING, RegistrationStatus.EXAMINING] },
    });

    if (existingRegistration) {
      throw new ConflictException(
        'Patient already has an active registration with this doctor on this date',
      );
    }

    const queueNumber = await this.generateQueueNumber(
      createRegistrationDto.doctorId,
      registrationDate,
    );

    const createdRegistration = new this.registrationModel({
      patientId: new Types.ObjectId(createRegistrationDto.patientId),
      doctorId: new Types.ObjectId(createRegistrationDto.doctorId),
      scheduleId: new Types.ObjectId(createRegistrationDto.scheduleId),
      registrationDate,
      registrationMethod: createRegistrationDto.registrationMethod,
      status: RegistrationStatus.WAITING,
      queueNumber,
    });

    const savedRegistration = await createdRegistration.save();

    await this.generateAndSaveEmbedding(savedRegistration._id.toString());

    return savedRegistration.toJSON(); // <-- FIXED
  }

  async findAll(queryDto: QueryRegistrationDto): Promise<{ data: Registration[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'registrationDate',
      sortOrder = 'desc',
      search,
      status,
      registrationMethod,
      dateFrom,
      dateTo,
    } = queryDto;

    const pipeline: any[] = [];

    // ========= MATCH FILTER =========
    const match: any = {};

    if (status) match.status = status;
    if (registrationMethod) match.registrationMethod = registrationMethod;

    if (dateFrom || dateTo) {
      match.registrationDate = {};
      if (dateFrom) match.registrationDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        match.registrationDate.$lte = toDate;
      }
    }

    if (search) {
      match.$or = [
        { queueNumber: { $regex: search, $options: 'i' } },
        { registrationCode: { $regex: search, $options: 'i' } },
      ];
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    // ========= LOOKUPS =========
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient',
        },
      },
      { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'doctorschedules',
          localField: 'scheduleId',
          foreignField: '_id',
          as: 'schedule',
        },
      },
      { $unwind: { path: '$schedule', preserveNullAndEmptyArrays: true } },
    );

    // ========= REMOVE SENSITIVE FIELDS + PROJECT =========
    pipeline.push({
      $project: {
        _id: 1,
        patientId: 1,
        doctorId: 1,
        scheduleId: 1,
        registrationCode: 1,
        registrationDate: 1,
        registrationMethod: 1,
        status: 1,
        queueNumber: 1,
        createdAt: 1,
        updatedAt: 1,

        // patient
        'patient._id': 1,
        'patient.fullName': 1,
        'patient.email': 1,
        'patient.phoneNumber': 1,
        'patient.gender': 1,
        'patient.address': 1,

        // doctor
        'doctor._id': 1,
        'doctor.fullName': 1,
        'doctor.specialization': 1,
        'doctor.email': 1,
        'doctor.phoneNumber': 1,

        // schedule
        'schedule._id': 1,
        'schedule.day': 1,
        'schedule.startTime': 1,
        'schedule.endTime': 1,
      },
    });

    // ========= CONVERT ALL IDS TO STRING =========
    pipeline.push({
      $addFields: {
        _id: { $toString: '$_id' },
        patientId: { $toString: '$patientId' },
        doctorId: { $toString: '$doctorId' },
        scheduleId: { $toString: '$scheduleId' },

        'patient._id': { $toString: '$patient._id' },
        'doctor._id': { $toString: '$doctor._id' },
        'schedule._id': { $toString: '$schedule._id' },
      },
    });

    // ========= SORT =========
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    if (sortBy === 'registrationDate') {
      sortOptions.queueNumber = 1;
    }

    const skip = (page - 1) * limit;

    pipeline.push({
      $facet: {
        data: [{ $sort: sortOptions }, { $skip: skip }, { $limit: limit }],
        totalData: [{ $count: 'count' }],
      },
    });

    pipeline.push({
      $project: {
        data: 1,
        total: { $ifNull: [{ $arrayElemAt: ['$totalData.count', 0] }, 0] },
      },
    });

    const result = await this.registrationModel.aggregate(pipeline).exec();

    return {
      data: result[0]?.data || [],
      total: result[0]?.total || 0,
    };
  }

  async findOne(id: string): Promise<Registration> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid registration ID');
    }

    const registration = await this.registrationModel
      .findById(id)
      .populate('patient')
      .populate('doctor')
      .populate('schedule')
      .exec();

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    return registration.toJSON();
  }

  async findByPatientId(patientId: string): Promise<Registration[]> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID');
    }

    const data = await this.registrationModel
      .find({ patientId: new Types.ObjectId(patientId) })
      .populate('patient')
      .populate('doctor')
      .populate('schedule')
      .sort({ registrationDate: -1, queueNumber: 1 })
      .exec();

    return data.map((item) => item.toObject());
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

    const data = await this.registrationModel
      .find(query)
      .populate('patient')
      .populate('doctor')
      .populate('schedule')
      .sort({ registrationDate: -1, queueNumber: 1 })
      .exec();

    return data.map((item) => item.toObject());
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

    return updatedRegistration.toObject();
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid registration ID');
    }

    await this.registrationModel.findByIdAndDelete(id).exec();
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

      await this.registrationModel
        .findByIdAndUpdate(registrationId, {
          embedding,
          embeddingText,
          embeddingUpdatedAt: new Date(),
        })
        .exec();
    } catch (error) {
      throw new Error(
        `Failed to generate embedding for registration ${registrationId}: ${error.message}`,
      );
    }
  }

  /**
   * Generate embeddings for multiple registrations
   * @param registrationIds - Array of registration IDs
   */
  async generateBatchEmbeddings(registrationIds: string[]): Promise<void> {
    for (const id of registrationIds) {
      try {
        await this.generateAndSaveEmbedding(id);
      } catch (error) {
        // Log but don't fail the batch
        console.error(`Failed to generate embedding for registration ${id}:`, error);
      }
    }
  }

  /**
   * Bulk import registrations from JSON data
   */
  async bulkImport(registrations: any[]): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const regData of registrations) {
      try {
        // Find patient by email
        const patient = await this.usersService.findByEmail(regData.patientEmail);
        if (!patient || patient.role !== UserRole.PATIENT) {
          failed++;
          errors.push({ patientEmail: regData.patientEmail, error: 'Patient not found or invalid role' });
          continue;
        }

        // Find doctor by email
        const doctor = await this.usersService.findByEmail(regData.doctorEmail);
        if (!doctor || doctor.role !== UserRole.DOCTOR) {
          failed++;
          errors.push({ doctorEmail: regData.doctorEmail, error: 'Doctor not found or invalid role' });
          continue;
        }

        // Create registration
        const created = await this.registrationModel.create({
          patientId: patient._id,
          doctorId: doctor._id,
          registrationDate: new Date(regData.registrationDate),
          registrationMethod: regData.registrationMethod,
          queueNumber: regData.queueNumber,
          status: 'waiting', // Default status
        });

        // Generate embedding asynchronously
        this.generateAndSaveEmbedding(created._id.toString()).catch(() => null);

        success++;
      } catch (error) {
        failed++;
        errors.push({
          patientEmail: regData.patientEmail,
          doctorEmail: regData.doctorEmail,
          error: error.message
        });
      }
    }

    return { success, failed, errors };
  }
}
