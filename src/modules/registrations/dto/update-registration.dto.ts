import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RegistrationStatus } from '../schemas/registration.schema';

export class UpdateRegistrationDto {
    @ApiProperty({ 
        description: 'Current patient status', 
        enum: RegistrationStatus,
        required: false 
    })
    @IsOptional()
    @IsEnum(RegistrationStatus)
    status?: RegistrationStatus;
}
