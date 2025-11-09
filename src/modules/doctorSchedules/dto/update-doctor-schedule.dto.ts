import { CreateDoctorScheduleDto } from './create-doctor-schedule.dto';
import { InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateDoctorScheduleDto extends PartialType(CreateDoctorScheduleDto) { }