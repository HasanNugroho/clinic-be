import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export class PaginationQueryDto {
    @ApiProperty({
        type: Number,
        required: false,
        description: 'Page number (starts from 1)',
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({
        type: Number,
        required: false,
        description: 'Number of items per page',
        example: 10,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({
        type: String,
        required: false,
        description: 'Field to sort by',
        example: 'createdAt',
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiProperty({
        enum: SortOrder,
        required: false,
        description: 'Sort order',
        example: SortOrder.DESC,
    })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;

    @ApiProperty({
        type: String,
        required: false,
        description: 'Search query',
        example: 'search text',
    })
    @IsOptional()
    @IsString()
    search?: string;
}

export class PaginationMetaDto {
    @ApiProperty({
        type: Number,
        description: 'Current page number',
        example: 1,
    })
    page: number;

    @ApiProperty({
        type: Number,
        description: 'Number of items per page',
        example: 10,
    })
    limit: number;

    @ApiProperty({
        type: Number,
        description: 'Total number of items',
        example: 150,
    })
    total: number;

    @ApiProperty({
        type: Number,
        description: 'Total number of pages',
        example: 15,
    })
    totalPages: number;

    @ApiProperty({
        type: Boolean,
        description: 'Has previous page',
        example: false,
    })
    hasPrevPage: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Has next page',
        example: true,
    })
    hasNextPage: boolean;
}

export class HttpResponse<T> {
    success: boolean;
    statusCode: number;
    message: string | string[];
    data?: T;
    meta?: any;

    constructor(
        statusCode: number,
        success: boolean,
        message: string | string[],
        data?: T,
        meta?: any,
    ) {
        this.statusCode = statusCode;
        this.success = success;
        this.message = message;
        this.data = data;
        this.meta = meta;
    }
}

export function PaginatedResponse<T>(classRef: new (...args: any[]) => T) {
    class PaginatedResponseClass {
        @ApiProperty({
            type: [classRef],
            description: 'Array of items',
        })
        data: T[];

        @ApiProperty({
            type: PaginationMetaDto,
            description: 'Pagination metadata',
            example: {
                page: 1,
                limit: 10,
                total: 150,
                totalPages: 15,
                hasPrevPage: false,
                hasNextPage: true,
            },
        })
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