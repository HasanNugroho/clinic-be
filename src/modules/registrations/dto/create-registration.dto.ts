import { IsEnum, IsNotEmpty, IsString, IsDateString } from 'class-validator';
import { RegistrationMethod } from '../schemas/registration.schema';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRegistrationDto {
    @ApiProperty({ description: 'Patient ID' })
    @IsNotEmpty()
    @IsString()
    patientId: string;

    @ApiProperty({ description: 'Doctor ID' })
    @IsNotEmpty()
    @IsString()
    doctorId: string;

    @ApiProperty({ description: 'Schedule ID' })
    @IsNotEmpty()
    @IsString()
    scheduleId: string;

    @ApiProperty({ description: 'Date of registration' })
    @IsNotEmpty()
    @IsDateString()
    registrationDate: string;
}
