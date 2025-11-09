import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { DayOfWeek } from '../schemas/doctor-schedule.schema';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class QueryDoctorScheduleDto extends PaginationQueryDto {
    @Field(() => DayOfWeek, { description: 'Filter by day of week', nullable: true })
    @IsOptional()
    @IsEnum(DayOfWeek)
    dayOfWeek?: DayOfWeek;
}
