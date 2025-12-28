import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClinicInfo } from './schemas/clinic-info.schema';
import { CreateClinicInfoDto } from './dto/create-clinic-info.dto';
import { UpdateClinicInfoDto } from './dto/update-clinic-info.dto';
import { QueryClinicInfoDto } from './dto/query-clinic-info.dto';

@Injectable()
export class ClinicInfoService {
  private readonly logger = new Logger(ClinicInfoService.name);

  constructor(
    @InjectModel(ClinicInfo.name)
    private clinicInfoModel: Model<ClinicInfo>,
  ) {}

  async create(createDto: CreateClinicInfoDto): Promise<ClinicInfo> {
    try {
      const clinicInfo = new this.clinicInfoModel(createDto);
      return await clinicInfo.save();
    } catch (error) {
      this.logger.error('Failed to create clinic info', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async findAll(query: QueryClinicInfoDto): Promise<ClinicInfo[]> {
    try {
      const filter: any = {};

      if (query.category) {
        filter.category = query.category;
      }

      return await this.clinicInfoModel.find(filter).sort({ createdAt: 1 }).exec();
    } catch (error) {
      this.logger.error('Failed to find clinic info', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async findOne(id: string): Promise<ClinicInfo> {
    try {
      const clinicInfo = await this.clinicInfoModel.findById(id).exec();

      if (!clinicInfo) {
        throw new NotFoundException(`Clinic info with ID ${id} not found`);
      }

      return clinicInfo;
    } catch (error) {
      this.logger.error('Failed to find clinic info by ID', {
        error: error.message,
        stack: error.stack,
        id,
      });
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateClinicInfoDto): Promise<ClinicInfo> {
    try {
      const clinicInfo = await this.clinicInfoModel
        .findByIdAndUpdate(id, updateDto, { new: true })
        .exec();

      if (!clinicInfo) {
        throw new NotFoundException(`Clinic info with ID ${id} not found`);
      }

      return clinicInfo;
    } catch (error) {
      this.logger.error('Failed to update clinic info', {
        error: error.message,
        stack: error.stack,
        id,
      });
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.clinicInfoModel.findByIdAndDelete(id).exec();

      if (!result) {
        throw new NotFoundException(`Clinic info with ID ${id} not found`);
      }
    } catch (error) {
      this.logger.error('Failed to delete clinic info', {
        error: error.message,
        stack: error.stack,
        id,
      });
      throw error;
    }
  }
}
