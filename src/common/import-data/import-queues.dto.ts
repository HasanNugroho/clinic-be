import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum ImportQueueStatus {
    WAITING = 'waiting',
    CURRENT = 'current',
    COMPLETED = 'completed',
    SKIPPED = 'skipped',
}

/**
 * Single Queue Import Item
 */
export class ImportQueueItemDto {
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
        example: 1,
        description: 'Queue number for the day',
    })
    @IsNumber()
    queueNumber: number;

    @ApiProperty({
        example: '2025-08-15',
        description: 'Queue date (ISO 8601 format)',
    })
    @IsDateString()
    queueDate: string;

    @ApiProperty({
        enum: ImportQueueStatus,
        example: ImportQueueStatus.WAITING,
        description: 'Queue status',
    })
    @IsEnum(ImportQueueStatus)
    status: ImportQueueStatus;
}

/**
 * Bulk Queue Import DTO
 */
export class ImportQueuesDto {
    @ApiProperty({
        type: [ImportQueueItemDto],
        description: 'Array of queues to import',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportQueueItemDto)
    queues: ImportQueueItemDto[];
}
