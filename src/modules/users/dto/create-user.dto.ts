import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    IsDateString,
    ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender, UserRole } from '../schemas/user.schema';

export class CreateUserDto {
    @ApiProperty({ description: 'User full name' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ description: 'User email address' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'User password (min 6 characters)' })
    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    password: string;

    @ApiProperty({ description: 'User phone number' })
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @ApiProperty({ description: 'User address' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty({ enum: Gender, description: 'User gender' })
    @IsEnum(Gender)
    @IsNotEmpty()
    gender: Gender;

    @ApiProperty({ enum: UserRole, description: 'User role' })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;

    @ApiProperty({ required: false, description: 'National ID number (optional)' })
    @IsString()
    @IsOptional()
    nik?: string;

    @ApiProperty({ required: false, description: 'Birth date (optional)' })
    @IsDateString()
    @IsOptional()
    birthDate?: string;

    @ApiProperty({ required: false, description: 'Doctor specialization (optional)' })
    @IsString()
    @IsOptional()
    specialization?: string;
}
