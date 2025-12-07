import { IsNotEmpty, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckinRegistrationDto {
    @ApiProperty({ description: 'Registration ID' })
    @IsNotEmpty()
    @IsString()
    registrationId: string;
}
