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
import { Queue, QueueSchema } from 'src/modules/queues/schemas/queue.schema';
import {
  Registration,
  RegistrationSchema,
} from 'src/modules/registrations/schemas/registration.schema';
import { User, UserSchema } from 'src/modules/users/schemas/user.schema';
import { Dashboard, DashboardSchema } from 'src/modules/dashboard/schemas/dashboard.schema';
import { ClinicInfo, ClinicInfoSchema } from 'src/modules/clinic-info/schemas/clinic-info.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DoctorSchedule.name, schema: DoctorScheduleSchema },
      { name: Registration.name, schema: RegistrationSchema },
      { name: Examination.name, schema: ExaminationSchema },
      { name: Queue.name, schema: QueueSchema },
      { name: Dashboard.name, schema: DashboardSchema },
      { name: ClinicInfo.name, schema: ClinicInfoSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
