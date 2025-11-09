import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorSchedulesService } from './doctor-schedules.service';
import { DoctorSchedulesResolver } from './doctor-schedules.resolver';
import { DoctorSchedule, DoctorScheduleSchema } from './schemas/doctor-schedule.schema';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from 'src/common/service/database.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  providers: [DoctorSchedulesService, DoctorSchedulesResolver],
  exports: [DoctorSchedulesService],
})
export class DoctorSchedulesModule {}
