import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsEnum } from 'class-validator';

export enum QdrantCollection {
  DASHBOARDS = 'dashboards',
  REGISTRATIONS = 'registrations',
  EXAMINATIONS = 'examinations',
  SCHEDULES = 'schedules',
  CLINIC_INFO = 'clinic_info',
}

export class QdrantRequestDto {
  @ApiProperty({
    description: 'Collections to index',
    enum: QdrantCollection,
    isArray: true,
    required: false,
    example: ['examinations', 'registrations'],
  })
  @IsOptional()
  @IsArray()
  collections?: QdrantCollection[];
}

export class QdrantIndexResultDto {
  @ApiProperty({
    description: 'Number of dashboards indexed',
    example: 10,
    type: 'number',
  })
  dashboards: number;

  @ApiProperty({
    description: 'Number of registrations indexed',
    example: 150,
    type: 'number',
  })
  registrations: number;

  @ApiProperty({
    description: 'Number of examinations indexed',
    example: 200,
    type: 'number',
  })
  examinations: number;

  @ApiProperty({
    description: 'Number of schedules indexed',
    example: 50,
    type: 'number',
  })
  schedules: number;

  @ApiProperty({
    description: 'Number of clinic info indexed',
    example: 4,
    type: 'number',
  })
  clinicInfos: number;
}

export class QdrantIndexResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
    type: 'boolean',
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
    type: 'number',
  })
  statusCode: number;

  @ApiProperty({
    description: 'Response message',
    example: 'All collections indexed successfully',
    type: 'string',
  })
  message: string;

  @ApiProperty({
    description: 'Indexing results and metadata',
    type: 'object',
    properties: {
      dashboards: { type: 'number', example: 10 },
      registrations: { type: 'number', example: 150 },
      examinations: { type: 'number', example: 200 },
      schedules: { type: 'number', example: 50 },
      clinicInfos: { type: 'number', example: 4 },
      total: { type: 'number', example: 414 },
      timestamp: { type: 'string', example: '2025-12-13T11:14:00.000Z' },
    },
  })
  data: {
    dashboards: number;
    registrations: number;
    examinations: number;
    schedules: number;
    clinicInfos: number;
    total: number;
    timestamp: string;
  };
}

export class QdrantInitializeResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
    type: 'boolean',
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
    type: 'number',
  })
  statusCode: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Qdrant collections initialized successfully',
    type: 'string',
  })
  message: string;

  @ApiProperty({
    description: 'Initialization results',
    type: 'object',
    properties: {
      collections: {
        type: 'array',
        items: { type: 'string' },
        example: ['dashboards', 'registrations', 'examinations', 'doctor_schedules', 'clinic_info'],
      },
      timestamp: { type: 'string', example: '2025-12-13T11:14:00.000Z' },
    },
  })
  data: {
    collections: string[];
    timestamp: string;
  };
}

export class QdrantReindexResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
    type: 'boolean',
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
    type: 'number',
  })
  statusCode: number;

  @ApiProperty({
    description: 'Response message',
    example: 'All collections reindexed successfully',
    type: 'string',
  })
  message: string;

  @ApiProperty({
    description: 'Reindexing results and metadata',
    type: 'object',
    properties: {
      dashboards: { type: 'number', example: 10 },
      registrations: { type: 'number', example: 150 },
      examinations: { type: 'number', example: 200 },
      schedules: { type: 'number', example: 50 },
      clinicInfos: { type: 'number', example: 4 },
      total: { type: 'number', example: 414 },
      timestamp: { type: 'string', example: '2025-12-13T11:14:00.000Z' },
    },
  })
  data: {
    dashboards: number;
    registrations: number;
    examinations: number;
    schedules: number;
    clinicInfos: number;
    total: number;
    timestamp: string;
  };
}
