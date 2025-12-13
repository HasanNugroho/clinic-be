import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DoctorSchedule } from './schemas/doctor-schedule.schema';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';
import { QueryDoctorScheduleDto } from './dto/query-doctor-schedule.dto';
import { UserRole } from '../users/schemas/user.schema';
import { QdrantIndexingService } from '../qdrant/qdrant-indexing.service';

@Injectable()
export class DoctorSchedulesService {
  constructor(
    @InjectModel(DoctorSchedule.name)
    private doctorScheduleModel: Model<DoctorSchedule>,
    private usersService: UsersService,
    private qdrantIndexingService: QdrantIndexingService,
  ) { }

  /* -------------------------------------------
     CREATE
  ------------------------------------------- */
  async create(createDoctorScheduleDto: CreateDoctorScheduleDto): Promise<DoctorSchedule> {
    if (createDoctorScheduleDto.startTime >= createDoctorScheduleDto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const doctor = await this.usersService.findOne(createDoctorScheduleDto.doctorId);
    if (!doctor || doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException('Invalid doctor ID or user is not a doctor');
    }

    const created = await this.doctorScheduleModel.create({
      ...createDoctorScheduleDto,
      doctorId: new Types.ObjectId(createDoctorScheduleDto.doctorId),
    });

    // async generate embedding
    this.generateAndSaveEmbedding(created._id.toString()).catch(() => null);

    return created.toJSON();
  }

  /* -------------------------------------------
     FIND ALL → FACET MODE (UNIFORM)
  ------------------------------------------- */
  async findAll(queryDto: QueryDoctorScheduleDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      dayOfWeek,
    } = queryDto;

    const skip = (page - 1) * limit;

    const pipeline: any[] = [];

    // MATCH FILTERS
    const match: any = {};
    if (dayOfWeek) match.dayOfWeek = dayOfWeek;
    pipeline.push({ $match: match });

    // LOOKUP WITH SAFE PROJECTION
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'doctorId',
        foreignField: '_id',
        as: 'doctor',
        pipeline: [
          {
            $project: {
              password: 0,
              nik: 0,
              birthDate: 0,
              __v: 0,
            },
          },
        ],
      },
    });

    pipeline.push({ $unwind: '$doctor' });

    // SEARCH
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'doctor.fullName': { $regex: search, $options: 'i' } },
            { 'doctor.specialization': { $regex: search, $options: 'i' } },
            { dayOfWeek: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push({
      $project: {
        __v: 0,
      },
    });

    // CONVERT IDs TO STRING
    pipeline.push({
      $addFields: {
        _id: { $toString: '$_id' },
        doctorId: { $toString: '$doctorId' },
        'doctor._id': { $toString: '$doctor._id' },
      },
    });

    // FACET (pagination + total)
    pipeline.push({
      $facet: {
        data: [
          { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        totalData: [{ $count: 'count' }],
      },
    });

    pipeline.push({
      $project: {
        data: 1,
        total: { $ifNull: [{ $arrayElemAt: ['$totalData.count', 0] }, 0] },
      },
    });

    const result = await this.doctorScheduleModel.aggregate(pipeline);

    return {
      data: result[0]?.data || [],
      total: result[0]?.total || 0,
    };
  }

  /* -------------------------------------------
     FIND ONE
  ------------------------------------------- */
  async findOne(id: string): Promise<DoctorSchedule> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid schedule ID');
    }

    const schedule = await this.doctorScheduleModel
      .findById(id)
      .populate('doctor') // virtual populate
      .exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule.toJSON();
  }

  /* -------------------------------------------
     FIND BY DOCTOR ID
  ------------------------------------------- */
  async findByDoctorId(doctorId: string): Promise<DoctorSchedule[]> {
    if (!Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('Invalid doctor ID');
    }

    const data = await this.doctorScheduleModel
      .find({ doctorId: new Types.ObjectId(doctorId) })
      .populate('doctor')
      .exec();

    return data.map((item) => item.toObject());
  }

  /* -------------------------------------------
     UPDATE
  ------------------------------------------- */
  async update(id: string, dto: UpdateDoctorScheduleDto): Promise<DoctorSchedule> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid schedule ID');
    }

    if (dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const updateData: any = { ...dto };
    if (dto.doctorId) updateData.doctorId = new Types.ObjectId(dto.doctorId);

    const updated = await this.doctorScheduleModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('doctor')
      .exec();

    if (!updated) {
      throw new NotFoundException('Schedule not found');
    }

    this.generateAndSaveEmbedding(id).catch(() => null);

    return updated.toJSON();
  }

  /* -------------------------------------------
     DELETE
  ------------------------------------------- */
  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid schedule ID');
    }
    await this.doctorScheduleModel.findByIdAndDelete(id).exec();
  }

  async generateAndSaveEmbedding(scheduleId: string): Promise<void> {
    const schedule = await this.doctorScheduleModel
      .findById(scheduleId)
      .populate('doctorId', 'fullName specialization')
      .exec();

    if (!schedule) return;

    // Index to Qdrant asynchronously (non-blocking)
    this.qdrantIndexingService.indexSchedule(schedule).catch((error) => {
      console.error(`Failed to index schedule ${scheduleId} to Qdrant:`, error);
    });
  }

  /**
   * Bulk import doctor schedules from JSON data
   */
  async bulkImport(schedules: any[]): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const scheduleData of schedules) {
      try {
        // Find doctor by email
        const doctor = await this.usersService.findByEmail(scheduleData.doctorEmail);
        if (!doctor || doctor.role !== UserRole.DOCTOR) {
          failed++;
          errors.push({ doctorEmail: scheduleData.doctorEmail, error: 'Doctor not found or invalid role' });
          continue;
        }

        // Validate times
        if (scheduleData.startTime >= scheduleData.endTime) {
          failed++;
          errors.push({ doctorEmail: scheduleData.doctorEmail, error: 'End time must be after start time' });
          continue;
        }

        // Create schedule
        const created = await this.doctorScheduleModel.create({
          doctorId: new Types.ObjectId(doctor._id),
          dayOfWeek: scheduleData.dayOfWeek,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          quota: scheduleData.quota,
        });

        // Generate embedding asynchronously
        this.generateAndSaveEmbedding(created._id.toString()).catch(() => null);

        success++;
      } catch (error) {
        failed++;
        errors.push({ doctorEmail: scheduleData.doctorEmail, error: error.message });
      }
    }

    return { success, failed, errors };
  }
}
