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
