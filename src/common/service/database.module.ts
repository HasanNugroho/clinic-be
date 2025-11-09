import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DoctorSchedule,
  DoctorScheduleSchema,
} from 'src/modules/doctorSchedules/schemas/doctor-schedule.schema';
import {
  Examination,
  ExaminationSchema,
} from 'src/modules/examinations/schemas/examination.schema';
import {
  Registration,
  RegistrationSchema,
} from 'src/modules/registrations/schemas/registration.schema';
import { User, UserSchema } from 'src/modules/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DoctorSchedule.name, schema: DoctorScheduleSchema },
      { name: Registration.name, schema: RegistrationSchema },
      { name: Examination.name, schema: ExaminationSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
