import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dtos/pagination.dto';
import { ExaminationStatus } from '../schemas/examination.schema';
import { ApiProperty } from '@nestjs/swagger';

export class QueryExaminationDto extends PaginationQueryDto {
    @ApiProperty({ enum: ExaminationStatus, required: false, description: 'Filter by status' })
    @IsOptional()
    @IsEnum(ExaminationStatus)
    status?: ExaminationStatus;

    @ApiProperty({ required: false, description: 'Filter by examination date (from)' })
    @IsOptional()
    @IsDateString()
    dateFrom?: Date;

    @ApiProperty({ required: false, description: 'Filter by examination date (to)' })
    @IsOptional()
    @IsDateString()
    dateTo?: Date;
}
