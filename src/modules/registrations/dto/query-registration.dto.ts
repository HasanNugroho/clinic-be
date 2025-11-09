import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { RegistrationStatus, RegistrationMethod } from '../schemas/registration.schema';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class QueryRegistrationDto extends PaginationQueryDto {
    @Field(() => RegistrationStatus, { description: 'Filter by status', nullable: true })
    @IsOptional()
    @IsEnum(RegistrationStatus)
    status?: RegistrationStatus;

    @Field(() => RegistrationMethod, { description: 'Filter by registration method', nullable: true })
    @IsOptional()
    @IsEnum(RegistrationMethod)
    registrationMethod?: RegistrationMethod;

    @Field(() => String, { description: 'Filter by registration date (from)', nullable: true })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @Field(() => String, { description: 'Filter by registration date (to)', nullable: true })
    @IsOptional()
    @IsDateString()
    dateTo?: string;
}
