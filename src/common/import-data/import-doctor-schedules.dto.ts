import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsNumber, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Single Doctor Schedule Import Item
 */
export class ImportDoctorScheduleItemDto {
    @ApiProperty({
        example: 'doctor@clinic.com',
        description: 'Doctor email (will be matched to existing doctor)',
    })
    @IsString()
    doctorEmail: string;

    @ApiProperty({
        example: 'Monday',
        description: 'Day of week or custom day name',
    })
    @IsString()
    dayOfWeek: string;

    @ApiProperty({
        example: '08:00',
        description: 'Start time (HH:mm format)',
    })
    @IsString()
    startTime: string;

    @ApiProperty({
        example: '17:00',
        description: 'End time (HH:mm format)',
    })
    @IsString()
    endTime: string;

    @ApiProperty({
        example: 30,
        description: 'Maximum quota for this schedule',
    })
    @IsNumber()
    quota: number;
}

/**
 * Bulk Doctor Schedule Import DTO
 */
export class ImportDoctorSchedulesDto {
    @ApiProperty({
        type: [ImportDoctorScheduleItemDto],
        description: 'Array of doctor schedules to import',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportDoctorScheduleItemDto)
    schedules: ImportDoctorScheduleItemDto[];
}
