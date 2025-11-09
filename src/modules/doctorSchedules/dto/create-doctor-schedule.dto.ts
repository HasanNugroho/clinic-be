import { IsEnum, IsNotEmpty, IsNumber, IsString, Matches } from 'class-validator';
import { DayOfWeek } from '../schemas/doctor-schedule.schema';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateDoctorScheduleDto {
    @Field(() => String, { description: 'Doctor ID (MongoDB ObjectId)' })
    @IsNotEmpty()
    @IsString()
    doctorId: string;

    @Field(() => DayOfWeek, { description: 'Day of the week', })
    @IsNotEmpty()
    @IsEnum(DayOfWeek)
    dayOfWeek: DayOfWeek;

    @Field(() => String, { description: 'Start time in HH:mm format', })
    @IsNotEmpty()
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'startTime must be in HH:mm format',
    })
    startTime: string;

    @Field(() => String, { description: 'End time in HH:mm format' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'endTime must be in HH:mm format',
    })
    endTime: string;


    @Field(() => Number, { description: 'Quota per day' })
    @IsNotEmpty()
    @IsNumber()
    quota: number
}