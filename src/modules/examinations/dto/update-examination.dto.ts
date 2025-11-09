import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ExaminationStatus } from '../schemas/examination.schema';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateExaminationDto {
    @Field(() => Date, { description: 'Date of examination', nullable: true })
    @IsOptional()
    @IsDateString()
    examinationDate?: string;

    @Field(() => String, { description: 'Brief diagnosis summary', nullable: true })
    @IsOptional()
    @IsString()
    diagnosisSummary?: string;

    @Field(() => String, { description: 'Additional notes from doctor', nullable: true })
    @IsOptional()
    @IsString()
    doctorNotes?: string;

    @Field(() => ExaminationStatus, { description: 'Examination status', nullable: true })
    @IsOptional()
    @IsEnum(ExaminationStatus)
    status?: ExaminationStatus;
}
