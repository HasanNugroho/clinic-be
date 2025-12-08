import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController } from './registrations.controller';
import { UsersModule } from '../users/users.module';
import { DoctorSchedulesModule } from '../doctorSchedules/doctor-schedules.module';
import { DatabaseModule } from 'src/common/services/database.module';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [DatabaseModule, UsersModule, DoctorSchedulesModule, QdrantModule,],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule { }
