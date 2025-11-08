import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController } from './registrations.controller';
import { Registration, RegistrationSchema } from './schemas/registration.schema';
import { UsersModule } from '../users/users.module';
import { DoctorSchedulesModule } from '../doctorSchedules/doctor-schedules.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Registration.name, schema: RegistrationSchema },
        ]),
        UsersModule,
        DoctorSchedulesModule,
    ],
    controllers: [RegistrationsController],
    providers: [RegistrationsService],
    exports: [RegistrationsService],
})
export class RegistrationsModule { }
