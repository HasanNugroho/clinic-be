import { IsEnum, IsOptional } from 'class-validator';
import { RegistrationStatus } from '../schemas/registration.schema';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRegistrationDto {
    @ApiProperty({ enum: RegistrationStatus, required: false, description: 'Current patient status' })
    @IsOptional()
    @IsEnum(RegistrationStatus)
    status?: RegistrationStatus;
}
