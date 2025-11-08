import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    IsDateString,
} from 'class-validator';
import { Gender, UserRole } from '../schemas/user.schema';

export class CreateUserDto {
    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Password123!' })
    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    password: string;

    @ApiProperty({ example: '08123456789' })
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @ApiProperty({ example: 'Jakarta, Indonesia' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty({ example: 'M', enum: Gender })
    @IsEnum(Gender)
    @IsNotEmpty()
    gender: Gender;

    @ApiProperty({ example: 'patient', enum: UserRole })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;

    @ApiProperty({ example: '1234567890123456', required: false })
    @IsString()
    @IsOptional()
    nik?: string;

    @ApiProperty({ example: '1990-01-01', required: false })
    @IsDateString()
    @IsOptional()
    birthDate?: string;

    @ApiProperty({ example: 'Cardiology', required: false })
    @IsString()
    @IsOptional()
    specialization?: string;
}
