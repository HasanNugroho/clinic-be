import { Module } from '@nestjs/common';
import { DoctorSchedulesService } from './doctor-schedules.service';
import { DoctorSchedulesController } from './doctor-schedules.controller';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from 'src/common/services/database.module';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [DatabaseModule, UsersModule, QdrantModule,],
  controllers: [DoctorSchedulesController],
  providers: [DoctorSchedulesService],
  exports: [DoctorSchedulesService],
})
export class DoctorSchedulesModule { }
