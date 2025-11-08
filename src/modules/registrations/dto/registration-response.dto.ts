import { ApiProperty } from '@nestjs/swagger';
import { RegistrationMethod, RegistrationStatus } from '../schemas/registration.schema';

export class RegistrationResponseDto {
    @ApiProperty({ description: 'Registration ID' })
    _id: string;

    @ApiProperty({ description: 'Patient ID' })
    patientId: string;

    @ApiProperty({ description: 'Doctor ID' })
    doctorId: string;

    @ApiProperty({ description: 'Schedule ID' })
    scheduleId: string;

    @ApiProperty({ description: 'Date of registration' })
    registrationDate: Date;

    @ApiProperty({ description: 'Registration method', enum: RegistrationMethod })
    registrationMethod: RegistrationMethod;

    @ApiProperty({ description: 'Current patient status', enum: RegistrationStatus })
    status: RegistrationStatus;

    @ApiProperty({ description: 'Queue number' })
    queueNumber: number;

    @ApiProperty({ description: 'Created at timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated at timestamp' })
    updatedAt: Date;
}
