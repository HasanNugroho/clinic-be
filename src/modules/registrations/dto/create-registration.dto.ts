import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsDateString } from 'class-validator';
import { RegistrationMethod } from '../schemas/registration.schema';

export class CreateRegistrationDto {
    @ApiProperty({ description: 'Patient ID', example: '507f1f77bcf86cd799439011' })
    @IsNotEmpty()
    @IsString()
    patientId: string;

    @ApiProperty({ description: 'Doctor ID', example: '507f1f77bcf86cd799439012' })
    @IsNotEmpty()
    @IsString()
    doctorId: string;

    @ApiProperty({ description: 'Schedule ID', example: '507f1f77bcf86cd799439013' })
    @IsNotEmpty()
    @IsString()
    scheduleId: string;

    @ApiProperty({ 
        description: 'Date of registration', 
        example: '2024-11-08',
        type: String 
    })
    @IsNotEmpty()
    @IsDateString()
    registrationDate: string;

    @ApiProperty({ 
        description: 'Registration method', 
        enum: RegistrationMethod,
        example: RegistrationMethod.ONLINE 
    })
    @IsNotEmpty()
    @IsEnum(RegistrationMethod)
    registrationMethod: RegistrationMethod;
}
