import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsMongoId, IsDateString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Queue, QueueStatus } from '../schemas/queue.schema';

export class QueryQueueDto {
  @ApiProperty({ required: false, description: 'Filter by doctor ID' })
  @IsOptional()
  @IsMongoId()
  doctorId?: string;

  @ApiProperty({ required: false, description: 'Filter by patient ID' })
  @IsOptional()
  @IsMongoId()
  patientId?: string;

  @ApiProperty({ required: false, description: 'Filter by queue date' })
  @IsOptional()
  @IsDateString()
  queueDate?: string;

  @ApiProperty({ enum: QueueStatus, required: false, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(QueueStatus)
  status?: QueueStatus;

  @ApiProperty({ type: Number, required: false, default: 1, description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ type: Number, required: false, default: 10, description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Sort by field' })
  @IsOptional()
  sortBy?: string;

  @ApiProperty({ required: false, description: 'Sort order (asc/desc)' })
  @IsOptional()
  sortOrder?: string;
}

export class QueuePaginatedResponse {
  data: Queue[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
