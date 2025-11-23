import { IsEnum, IsNotEmpty, IsNumber, IsString, Matches } from 'class-validator';
import { DayOfWeek } from '../schemas/doctor-schedule.schema';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDoctorScheduleDto {
    @ApiProperty({ description: 'Doctor ID (MongoDB ObjectId)' })
    @IsNotEmpty()
    @IsString()
    doctorId: string;

    @ApiProperty({ enum: DayOfWeek, description: 'Day of the week' })
    @IsNotEmpty()
    @IsEnum(DayOfWeek)
    dayOfWeek: DayOfWeek;

    @ApiProperty({ description: 'Start time in HH:mm format' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'startTime must be in HH:mm format',
    })
    startTime: string;

    @ApiProperty({ description: 'End time in HH:mm format' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'endTime must be in HH:mm format',
    })
    endTime: string;

    @ApiProperty({ description: 'Quota per day' })
    @IsNotEmpty()
    @IsNumber()
    quota: number;
}