import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class RagQueryDto {
  @ApiProperty({
    description: 'Search query in natural language',
    example: 'hypertension treatment',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'session of conversation',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export interface RetrievalResult {
  collection: string;
  documentId: string;
  snippet: string;
  score: number;
  metadata?: any;
  titleText?: string;
}

export class AiAssistantResponse {
  query: string;
  answer: string;
  sources: RetrievalResult[];
  processingTimeMs: number;
  followUpQuestion?: string;
  needsMoreInfo?: boolean;
  suggestedFollowUps?: string[];
  sessionId?: string;
  images?: string[];
  links?: string[];
}
