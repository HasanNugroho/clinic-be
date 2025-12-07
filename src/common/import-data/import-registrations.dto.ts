import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum ImportRegistrationMethod {
    ONLINE = 'online',
    OFFLINE = 'offline',
}

/**
 * Single Registration Import Item
 */
export class ImportRegistrationItemDto {
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
        example: '2025-08-15T09:00:00Z',
        description: 'Registration date and time (ISO 8601 format)',
    })
    @IsDateString()
    registrationDate: string;

    @ApiProperty({
        enum: ImportRegistrationMethod,
        example: ImportRegistrationMethod.ONLINE,
        description: 'Registration method',
    })
    @IsEnum(ImportRegistrationMethod)
    registrationMethod: ImportRegistrationMethod;

    @ApiProperty({
        example: 1,
        description: 'Queue number',
    })
    @IsNumber()
    queueNumber: number;
}

/**
 * Bulk Registration Import DTO
 */
export class ImportRegistrationsDto {
    @ApiProperty({
        type: [ImportRegistrationItemDto],
        description: 'Array of registrations to import',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportRegistrationItemDto)
    registrations: ImportRegistrationItemDto[];
}
