import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsEmail, IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, UserRole } from '../../modules/users/schemas/user.schema';

/**
 * Single User Import Item
 */
export class ImportUserItemDto {
    @ApiProperty({
        example: 'John Doe',
        description: 'Full name of the user',
    })
    @IsString()
    fullName: string;

    @ApiProperty({
        example: '1234567890123456',
        description: 'National ID number',
        required: false,
    })
    @IsOptional()
    @IsString()
    nik?: string;

    @ApiProperty({
        example: '1990-01-15',
        description: 'Birth date (ISO 8601 format)',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    birthDate?: string;

    @ApiProperty({
        enum: Gender,
        example: Gender.MALE,
        description: 'User gender (M or F)',
    })
    @IsEnum(Gender)
    gender: Gender;

    @ApiProperty({
        example: '123 Main St, City, Country',
        description: 'User address',
    })
    @IsString()
    address: string;

    @ApiProperty({
        example: '+62812345678',
        description: 'User phone number',
    })
    @IsString()
    phoneNumber: string;

    @ApiProperty({
        example: 'john@example.com',
        description: 'User email address (unique)',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'password123',
        description: 'User password',
    })
    @IsString()
    password: string;

    @ApiProperty({
        enum: UserRole,
        example: UserRole.PATIENT,
        description: 'User role',
    })
    @IsEnum(UserRole)
    role: UserRole;

    @ApiProperty({
        example: 'Cardiology',
        description: 'Doctor specialization (required for doctors)',
        required: false,
    })
    @IsOptional()
    @IsString()
    specialization?: string;
}

/**
 * Bulk User Import DTO
 */
export class ImportUsersDto {
    @ApiProperty({
        type: [ImportUserItemDto],
        description: 'Array of users to import',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportUserItemDto)
    users: ImportUserItemDto[];
}
