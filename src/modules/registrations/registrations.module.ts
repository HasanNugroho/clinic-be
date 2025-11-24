import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController } from './registrations.controller';
import { UsersModule } from '../users/users.module';
import { DoctorSchedulesModule } from '../doctorSchedules/doctor-schedules.module';
import { DatabaseModule } from 'src/common/services/database.module';
import { EmbeddingModule } from 'src/common/services/embedding/embedding.modul';

@Module({
  imports: [DatabaseModule, UsersModule, DoctorSchedulesModule, EmbeddingModule,],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule { }
