import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ExaminationStatus } from '../schemas/examination.schema';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateExaminationDto {
    @ApiProperty({ required: false, description: 'Date of examination' })
    @IsOptional()
    @IsDateString()
    examinationDate?: string;

    @ApiProperty({ required: false, description: 'Brief diagnosis summary' })
    @IsOptional()
    @IsString()
    diagnosisSummary?: string;

    @ApiProperty({ required: false, description: 'Additional notes from doctor' })
    @IsOptional()
    @IsString()
    doctorNotes?: string;

    @ApiProperty({ enum: ExaminationStatus, required: false, description: 'Examination status' })
    @IsOptional()
    @IsEnum(ExaminationStatus)
    status?: ExaminationStatus;
}
