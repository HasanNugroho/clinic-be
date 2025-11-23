import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DoctorSchedule } from './schemas/doctor-schedule.schema';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';
import { QueryDoctorScheduleDto } from './dto/query-doctor-schedule.dto';
import { UserRole } from '../users/schemas/user.schema';
import { PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class DoctorSchedulesService {
  constructor(
    @InjectModel(DoctorSchedule.name)
    private doctorScheduleModel: Model<DoctorSchedule>,
    private usersService: UsersService,
  ) { }

  async create(createDoctorScheduleDto: CreateDoctorScheduleDto): Promise<DoctorSchedule> {
    // Validate that end time is after start time
    if (createDoctorScheduleDto.startTime >= createDoctorScheduleDto.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const doctor = await this.usersService.findOne(createDoctorScheduleDto.doctorId);
    if (!doctor || doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException('Invalid doctor ID or user is not a doctor');
    }

    const createdSchedule = new this.doctorScheduleModel({
      ...createDoctorScheduleDto,
      doctorId: new Types.ObjectId(createDoctorScheduleDto.doctorId),
    });
    return await createdSchedule.save();
  }

  async findAll(
    queryDto: QueryDoctorScheduleDto,
  ): Promise<InstanceType<ReturnType<typeof PaginatedResponse<DoctorSchedule>>>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      dayOfWeek,
    } = queryDto;

    // Build filter query
    const filter: any = {};

    if (dayOfWeek) {
      filter.dayOfWeek = dayOfWeek;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [data, total] = await Promise.all([
      this.doctorScheduleModel
        .find(filter)
        .populate('doctorId', 'fullName specialization')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.doctorScheduleModel.countDocuments(filter).exec(),
    ]);

    const PaginatedDoctorScheduleResponse = PaginatedResponse(DoctorSchedule);
    return new PaginatedDoctorScheduleResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<DoctorSchedule> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid schedule ID');
    }

    const schedule = await this.doctorScheduleModel
      .findById(id)
      .populate('doctorId', 'fullName specialization')
      .exec();

    if (!schedule) {
      throw new NotFoundException(`Doctor schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async findByDoctorId(doctorId: string): Promise<DoctorSchedule[]> {
    if (!Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('Invalid doctor ID');
    }

    return this.doctorScheduleModel.find({ doctorId: new Types.ObjectId(doctorId) }).exec();
  }

  async update(
    id: string,
    updateDoctorScheduleDto: UpdateDoctorScheduleDto,
  ): Promise<DoctorSchedule> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid schedule ID');
    }

    // Validate time if both are provided
    if (updateDoctorScheduleDto.startTime && updateDoctorScheduleDto.endTime) {
      if (updateDoctorScheduleDto.startTime >= updateDoctorScheduleDto.endTime) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    const updateData: any = { ...updateDoctorScheduleDto };
    if (updateDoctorScheduleDto.doctorId) {
      updateData.doctorId = new Types.ObjectId(updateDoctorScheduleDto.doctorId);
    }

    const updatedSchedule = await this.doctorScheduleModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('doctorId', 'fullName specialization')
      .exec();

    if (!updatedSchedule) {
      throw new NotFoundException(`Doctor schedule with ID ${id} not found`);
    }

    return updatedSchedule;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid schedule ID');
    }

    const result = await this.doctorScheduleModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Doctor schedule with ID ${id} not found`);
    }
  }
}
