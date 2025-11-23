import { CreateDoctorScheduleDto } from './create-doctor-schedule.dto';
import { PartialType } from '@nestjs/swagger';

export class UpdateDoctorScheduleDto extends PartialType(CreateDoctorScheduleDto) { }