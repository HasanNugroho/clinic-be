import { IsEnum, IsNotEmpty, IsString, IsDateString } from 'class-validator';
import { RegistrationMethod } from '../schemas/registration.schema';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateRegistrationDto {
    @Field(() => String, { description: 'Patient ID' })
    @IsNotEmpty()
    @IsString()
    patientId: string;

    @Field(() => String, { description: 'Doctor ID' })
    @IsNotEmpty()
    @IsString()
    doctorId: string;

    @Field(() => String, { description: 'Schedule ID' })
    @IsNotEmpty()
    @IsString()
    scheduleId: string;

    @Field(() => String, {
        description: 'Date of registration',
    })
    @IsNotEmpty()
    @IsDateString()
    registrationDate: string;

    @Field(() => RegistrationMethod, {
        description: 'Registration method',
    })
    @IsNotEmpty()
    @IsEnum(RegistrationMethod)
    registrationMethod: RegistrationMethod;
}
