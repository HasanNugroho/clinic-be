import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Registration, RegistrationStatus, RegistrationMethod } from './schemas/registration.schema';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { QueryRegistrationDto } from './dto/query-registration.dto';
import { CheckinRegistrationDto } from './dto/checkin-registration.dto';
import { UsersService } from '../users/users.service';
import { DoctorSchedulesService } from '../doctorSchedules/doctor-schedules.service';
import { UserRole } from '../users/schemas/user.schema';
import { QdrantIndexingService } from '../qdrant/qdrant-indexing.service';
import { DoctorSchedule } from '../doctorSchedules/schemas/doctor-schedule.schema';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectModel(Registration.name)
    private registrationModel: Model<Registration>,
    @InjectModel(DoctorSchedule.name)
    private scheduleModel: Model<DoctorSchedule>,
    private usersService: UsersService,
    private doctorSchedulesService: DoctorSchedulesService,
    private qdrantIndexingService: QdrantIndexingService,
  ) { }

  async create(createRegistrationDto: CreateRegistrationDto, user?: any): Promise<Registration> {
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

    // Check quota only for non-admin users
    // Admin users can create registrations beyond quota limits
    const isAdmin = user && user.role === UserRole.ADMIN;
    if (!isAdmin) {
      const registrationCount = await this.registrationModel.countDocuments({
        doctorId: new Types.ObjectId(createRegistrationDto.doctorId),
        scheduleId: new Types.ObjectId(createRegistrationDto.scheduleId),
        registrationDate,
        status: { $in: [RegistrationStatus.WAITING, RegistrationStatus.EXAMINING] },
      });

      const quotaLimit = typeof schedule.quota === 'string' ? parseInt(schedule.quota, 10) : schedule.quota;
      if (registrationCount >= quotaLimit) {
        throw new ConflictException(
          `Doctor schedule quota (${schedule.quota}) is full for this date. Cannot add more registrations.`,
        );
      }
    }

    // Determine registration method based on user role
    // Admin creates offline registrations, non-admin creates online registrations
    const registrationMethod = isAdmin ? RegistrationMethod.OFFLINE : RegistrationMethod.ONLINE;

    // Generate queue number only for OFFLINE registrations (admin)
    // ONLINE registrations get queue number when patient checks in
    let queueNumber: number | null = null;
    if (registrationMethod === RegistrationMethod.OFFLINE) {
      queueNumber = await this.generateQueueNumber(
        createRegistrationDto.doctorId,
        registrationDate,
      );
    }

    const createdRegistration = new this.registrationModel({
      patientId: new Types.ObjectId(createRegistrationDto.patientId),
      doctorId: new Types.ObjectId(createRegistrationDto.doctorId),
      scheduleId: new Types.ObjectId(createRegistrationDto.scheduleId),
      registrationDate,
      registrationMethod,
      status: RegistrationStatus.WAITING,
      queueNumber,
    });

    const savedRegistration = await createdRegistration.save();

    await this.generateAndSaveEmbedding(savedRegistration._id.toString());

    return savedRegistration.toJSON();
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

      // Index to Qdrant asynchronously (non-blocking)
      this.qdrantIndexingService.indexRegistration(registration).catch((error) => {
        console.error(`Failed to index registration ${registrationId} to Qdrant:`, error);
      });
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
   * Helper method to convert date to day of week name in Indonesian
   * Used to match with doctor schedule day of week
   */
  private getDayOfWeek(date: Date): string {
    const daysInIndonesian = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    return daysInIndonesian[date.getDay()];
  }

  /**
   * Bulk import registrations from JSON data
   * Automatically finds and links scheduleId based on doctor and registration date
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

        // Get registration date and determine day of week
        const registrationDate = new Date(regData.registrationDate);
        const dayOfWeek = this.getDayOfWeek(registrationDate);
        const doctorOid = new Types.ObjectId(doctor._id);

        // Find schedule for this doctor on this day of week
        const schedule = await this.scheduleModel.findOne({
          doctorId: doctorOid,
          dayOfWeek: dayOfWeek
        });

        if (!schedule) {
          failed++;
          errors.push({
            patientEmail: regData.patientEmail,
            doctorEmail: regData.doctorEmail,
            registrationDate: regData.registrationDate,
            error: `No schedule found for doctor on ${dayOfWeek}`
          });
          continue;
        }

        // Create registration with scheduleId
        const created = await this.registrationModel.create({
          patientId: new Types.ObjectId(patient._id),
          doctorId: new Types.ObjectId(doctor._id),
          scheduleId: schedule._id,
          registrationDate: new Date(registrationDate.toISOString().split('T')[0]),
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

  /**
   * Validate online registration before check-in
   * Checks if registration exists and is valid for check-in
   */
  async validateRegistration(registrationId: string): Promise<Registration> {
    const registration = await this.registrationModel.findById(registrationId).exec();

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    // Only online registrations can be checked in
    if (registration.registrationMethod !== RegistrationMethod.ONLINE) {
      throw new BadRequestException('Only online registrations can be checked in. Offline registrations are already queued.');
    }

    // Registration must be in waiting status
    if (registration.status !== RegistrationStatus.WAITING) {
      throw new BadRequestException(`Registration status is ${registration.status}. Only waiting registrations can be checked in.`);
    }

    // Registration must not already have a queue number
    if (registration.queueNumber) {
      throw new ConflictException('Patient has already checked in for this registration');
    }

    return registration;
  }

  /**
   * Check-in patient and generate queue number
   * Called when patient arrives at clinic for online registration
   */
  async checkinRegistration(checkinDto: CheckinRegistrationDto): Promise<Registration> {
    // Validate registration first
    const registration = await this.validateRegistration(checkinDto.registrationId);

    const checkinDate = new Date();
    checkinDate.setHours(0, 0, 0, 0);

    // Generate queue number for this registration
    const queueNumber = await this.generateQueueNumber(
      registration.doctorId.toString(),
      checkinDate,
    );

    // Update registration with queue number
    const updatedRegistration = await this.registrationModel.findByIdAndUpdate(
      checkinDto.registrationId,
      { queueNumber },
      { new: true },
    ).exec();

    if (!updatedRegistration) {
      throw new NotFoundException('Failed to update registration');
    }

    return updatedRegistration.toJSON();
  }
}
