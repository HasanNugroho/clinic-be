import { IsNotEmpty, IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ExaminationStatus } from '../schemas/examination.schema';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateExaminationDto {
    @Field(() => String, { description: 'Registration ID', nullable: false })
    @IsNotEmpty()
    @IsString()
    registrationId: string;

    @Field(() => String, { description: 'Doctor ID', nullable: false })
    @IsNotEmpty()
    @IsString()
    doctorId: string;

    @Field(() => String, { description: 'Patient ID', nullable: false })
    @IsNotEmpty()
    @IsString()
    patientId: string;

    @Field(() => String, { description: 'Examination date', nullable: false })
    @IsNotEmpty()
    @IsDateString()
    examinationDate: string;

    @Field(() => String, { description: 'Diagnosis summary', nullable: false })
    @IsNotEmpty()
    @IsString()
    diagnosisSummary: string;

    @Field(() => String, { description: 'Doctor notes', nullable: false })
    @IsNotEmpty()
    @IsString()
    doctorNotes: string;

    @Field(() => ExaminationStatus, { description: 'Examination status', nullable: true })
    @IsOptional()
    @IsEnum(ExaminationStatus)
    status?: ExaminationStatus;
}
