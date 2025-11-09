import { Field, InputType, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

registerEnumType(SortOrder, {
    name: 'SortOrder',
    description: 'Sort order',
});

@InputType()
export class PaginationQueryDto {
    @Field(() => Number, { nullable: true, description: 'Page number (starts from 1)' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @Field(() => Number, { nullable: true, description: 'Number of items per page' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @Field(() => String, { nullable: true, description: 'Field to sort by' })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @Field(() => SortOrder, { nullable: true, description: 'Sort order' })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;

    @Field(() => String, { nullable: true, description: 'Search query' })
    @IsOptional()
    @IsString()
    search?: string;
}

@ObjectType()
export class PaginationMetaDto {
    @Field(() => Number, { description: 'Current page number' })
    page: number;

    @Field(() => Number, { description: 'Number of items per page' })
    limit: number;

    @Field(() => Number, { description: 'Total number of items' })
    total: number;

    @Field(() => Number, { description: 'Total number of pages' })
    totalPages: number;

    @Field(() => Boolean, { description: 'Has previous page' })
    hasPrevPage: boolean;

    @Field(() => Boolean, { description: 'Has next page' })
    hasNextPage: boolean;
}

export function PaginatedResponse<T>(classRef: new (...args: any[]) => T) {
    @ObjectType()
    class PaginatedResponseClass {
        @Field(() => [classRef], { description: 'Array of items' })
        data: T[];

        @Field(() => PaginationMetaDto, { description: 'Pagination metadata' })
        meta: PaginationMetaDto;

        constructor(data: T[], total: number, page: number, limit: number) {
            this.data = data;
            const totalPages = Math.ceil(total / limit);
            this.meta = {
                page,
                limit,
                total,
                totalPages,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages,
            };
        }
    }

    return PaginatedResponseClass;
}
