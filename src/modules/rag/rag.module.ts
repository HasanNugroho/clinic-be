import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { Registration, RegistrationSchema } from '../registrations/schemas/registration.schema';
import { Examination, ExaminationSchema } from '../examinations/schemas/examination.schema';
import { DoctorSchedule, DoctorScheduleSchema } from '../doctorSchedules/schemas/doctor-schedule.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Dashboard, DashboardSchema } from '../dashboard/schemas/dashboard.schema';
import { EmbeddingModule } from '../../common/services/embedding/embedding.modul';
import { RedisModule } from 'src/common/services/redis/redis.modul';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Registration.name, schema: RegistrationSchema },
      { name: Examination.name, schema: ExaminationSchema },
      { name: DoctorSchedule.name, schema: DoctorScheduleSchema },
      { name: User.name, schema: UserSchema },
      { name: Dashboard.name, schema: DashboardSchema },
    ]),
    EmbeddingModule,
    RedisModule,
    QdrantModule,
  ],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule { }
