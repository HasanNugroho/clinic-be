import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsMongoId, IsDateString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dtos/pagination.dto';
import { Queue, QueueStatus } from '../schemas/queue.schema';

export class QueryQueueDto extends PaginationQueryDto {
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
}

export class QueuePaginatedResponse {
  data: Queue[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
