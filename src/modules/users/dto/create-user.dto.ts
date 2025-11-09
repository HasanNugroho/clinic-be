import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    IsDateString,
} from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';
import { Gender, UserRole } from '../schemas/user.schema';

@InputType()
export class CreateUserDto {
    @Field({ description: 'User full name' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @Field({ description: 'User email address' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @Field({ description: 'User password (min 6 characters)' })
    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    password: string;

    @Field({ description: 'User phone number' })
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @Field({ description: 'User address' })
    @IsString()
    @IsNotEmpty()
    address: string;

    @Field(() => Gender, { description: 'User gender' })
    @IsEnum(Gender)
    @IsNotEmpty()
    gender: Gender;

    @Field(() => UserRole, { description: 'User role' })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;

    @Field({ nullable: true, description: 'National ID number (optional)' })
    @IsString()
    @IsOptional()
    nik?: string;

    @Field({ nullable: true, description: 'Birth date (optional)' })
    @IsDateString()
    @IsOptional()
    birthDate?: string;

    @Field({ nullable: true, description: 'Doctor specialization (optional)' })
    @IsString()
    @IsOptional()
    specialization?: string;
}
