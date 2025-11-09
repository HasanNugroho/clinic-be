import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsResolver } from './registrations.resolver';
import { UsersModule } from '../users/users.module';
import { DoctorSchedulesModule } from '../doctorSchedules/doctor-schedules.module';
import { DatabaseModule } from 'src/common/service/database.module';

@Module({
  imports: [DatabaseModule, UsersModule, DoctorSchedulesModule],
  providers: [RegistrationsService, RegistrationsResolver],
  exports: [RegistrationsService],
})
export class RegistrationsModule { }
