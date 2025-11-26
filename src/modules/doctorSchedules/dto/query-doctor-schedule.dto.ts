import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dtos/pagination.dto';
import { DayOfWeek } from '../schemas/doctor-schedule.schema';
import { ApiProperty } from '@nestjs/swagger';

export class QueryDoctorScheduleDto extends PaginationQueryDto {
  @ApiProperty({ enum: DayOfWeek, required: false, description: 'Filter by day of week' })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;
}
