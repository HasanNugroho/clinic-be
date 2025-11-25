import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { Registration, RegistrationSchema } from '../registrations/schemas/registration.schema';
import { Examination, ExaminationSchema } from '../examinations/schemas/examination.schema';
import { DoctorSchedule, DoctorScheduleSchema } from '../doctorSchedules/schemas/doctor-schedule.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { EmbeddingModule } from '../../common/services/embedding/embedding.modul';
import { RedisModule } from 'src/common/services/redis/redis.modul';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Registration.name, schema: RegistrationSchema },
      { name: Examination.name, schema: ExaminationSchema },
      { name: DoctorSchedule.name, schema: DoctorScheduleSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EmbeddingModule,
    RedisModule
  ],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule { }
