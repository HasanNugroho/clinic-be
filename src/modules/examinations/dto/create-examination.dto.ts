import { IsNotEmpty, IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ExaminationStatus } from '../schemas/examination.schema';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExaminationDto {
    @ApiProperty({ description: 'Registration ID' })
    @IsNotEmpty()
    @IsString()
    registrationId: string;

    @ApiProperty({ description: 'Doctor ID' })
    @IsNotEmpty()
    @IsString()
    doctorId: string;

    @ApiProperty({ description: 'Patient ID' })
    @IsNotEmpty()
    @IsString()
    patientId: string;

    @ApiProperty({ description: 'Examination date' })
    @IsNotEmpty()
    @IsDateString()
    examinationDate: string;

    @ApiProperty({ description: 'Diagnosis summary' })
    @IsNotEmpty()
    @IsString()
    diagnosisSummary: string;

    @ApiProperty({ description: 'Doctor notes' })
    @IsNotEmpty()
    @IsString()
    doctorNotes: string;

    @ApiProperty({ enum: ExaminationStatus, required: false, description: 'Examination status' })
    @IsOptional()
    @IsEnum(ExaminationStatus)
    status?: ExaminationStatus;
}
