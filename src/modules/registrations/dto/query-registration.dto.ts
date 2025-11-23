import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { RegistrationStatus, RegistrationMethod } from '../schemas/registration.schema';
import { ApiProperty } from '@nestjs/swagger';

export class QueryRegistrationDto extends PaginationQueryDto {
    @ApiProperty({ enum: RegistrationStatus, required: false, description: 'Filter by status' })
    @IsOptional()
    @IsEnum(RegistrationStatus)
    status?: RegistrationStatus;

    @ApiProperty({ enum: RegistrationMethod, required: false, description: 'Filter by registration method' })
    @IsOptional()
    @IsEnum(RegistrationMethod)
    registrationMethod?: RegistrationMethod;

    @ApiProperty({ required: false, description: 'Filter by registration date (from)' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiProperty({ required: false, description: 'Filter by registration date (to)' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;
}
