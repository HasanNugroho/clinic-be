import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { ExaminationStatus } from '../schemas/examination.schema';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class QueryExaminationDto extends PaginationQueryDto {
    @Field(() => ExaminationStatus, { description: 'Filter by status', nullable: true })
    @IsOptional()
    @IsEnum(ExaminationStatus)
    status?: ExaminationStatus;

    @Field(() => Date, { description: 'Filter by examination date (from)', nullable: true })
    @IsOptional()
    @IsDateString()
    dateFrom?: Date;

    @Field(() => Date, { description: 'Filter by examination date (to)', nullable: true })
    @IsOptional()
    @IsDateString()
    dateTo?: Date;
}
