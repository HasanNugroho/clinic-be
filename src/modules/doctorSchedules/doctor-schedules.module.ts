import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorSchedulesService } from './doctor-schedules.service';
import { DoctorSchedulesController } from './doctor-schedules.controller';
import { DoctorSchedule, DoctorScheduleSchema } from './schemas/doctor-schedule.schema';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from 'src/common/services/database.module';
import { EmbeddingModule } from 'src/common/services/embedding/embedding.modul';

@Module({
  imports: [DatabaseModule, UsersModule, EmbeddingModule,],
  controllers: [DoctorSchedulesController],
  providers: [DoctorSchedulesService],
  exports: [DoctorSchedulesService],
})
export class DoctorSchedulesModule { }
