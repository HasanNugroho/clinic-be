import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClinicInfo } from './schemas/clinic-info.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ClinicInfoSeeder {
  private readonly logger = new Logger(ClinicInfoSeeder.name);

  constructor(
    @InjectModel(ClinicInfo.name)
    private clinicInfoModel: Model<ClinicInfo>,
  ) {}

  async seed(): Promise<void> {
    try {
      const count = await this.clinicInfoModel.countDocuments();

      if (count > 0) {
        this.logger.log('Clinic info data already exists. Skipping seed.');
        return;
      }

      const dataPath = path.join(__dirname, 'clinic-info-dummy-data.json');
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const clinicInfoData = JSON.parse(rawData);

      await this.clinicInfoModel.insertMany(clinicInfoData);

      this.logger.log(`Successfully seeded ${clinicInfoData.length} clinic info records`);
    } catch (error) {
      this.logger.error('Failed to seed clinic info data', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.clinicInfoModel.deleteMany({});
      this.logger.log('Successfully cleared all clinic info records');
    } catch (error) {
      this.logger.error('Failed to clear clinic info data', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
