import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ImportExaminationStatus {
    COMPLETED = 'completed',
    PENDING = 'pending',
}

/**
 * Single Examination Import Item
 */
export class ImportExaminationItemDto {
    @ApiProperty({
        example: 'john.smith@email.com',
        description: 'Patient email (will be matched to existing patient)',
    })
    @IsString()
    patientEmail: string;

    @ApiProperty({
        example: 'sarah.johnson@clinic.com',
        description: 'Doctor email (will be matched to existing doctor)',
    })
    @IsString()
    doctorEmail: string;

    @ApiProperty({
        example: '2025-08-15T10:00:00Z',
        description: 'Examination date and time (ISO 8601 format)',
    })
    @IsDateString()
    examinationDate: string;

    @ApiProperty({
        example: 'Patient shows signs of hypertension. Blood pressure: 140/90 mmHg.',
        description: 'Diagnosis summary',
    })
    @IsString()
    diagnosisSummary: string;

    @ApiProperty({
        example: 'Recommended lifestyle changes and prescribed medication for blood pressure control.',
        description: 'Doctor notes',
    })
    @IsString()
    doctorNotes: string;

    @ApiProperty({
        enum: ImportExaminationStatus,
        example: ImportExaminationStatus.COMPLETED,
        description: 'Examination status',
    })
    @IsEnum(ImportExaminationStatus)
    status: ImportExaminationStatus;
}

/**
 * Bulk Examination Import DTO
 */
export class ImportExaminationsDto {
    @ApiProperty({
        type: [ImportExaminationItemDto],
        description: 'Array of examinations to import',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportExaminationItemDto)
    examinations: ImportExaminationItemDto[];
}
