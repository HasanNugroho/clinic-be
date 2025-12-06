import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, } from '@nestjs/swagger';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiHttpResponse,
  ApiHttpErrorResponse,
} from '../../common/decorators/api-response.decorator';
import { AiAssistantResponse, RagQueryDto } from './rag.dto';


@ApiTags('RAG - Retrieval Augmented Generation')
@Controller('rag')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RagController {
  constructor(private readonly ragService: RagService) { }

  /**
   * Query RAG system with vector similarity search
   * Role-based access control:
   * - Patient: Can search doctor schedules and their own examinations
   * - Doctor: Can search their own examinations and registrations
   * - Admin: Can search all data
   */
  @Post('query')
  @ApiOperation({
    summary: 'Query RAG system with vector similarity search',
  })
  @ApiHttpResponse(200, 'Query results retrieved successfully', AiAssistantResponse)
  @ApiHttpErrorResponse(400, 'Invalid query - query string is required')
  @ApiHttpErrorResponse(401, 'Unauthorized - JWT token required')
  @ApiHttpErrorResponse(500, 'Server error - embedding generation failed')
  @ApiBearerAuth('access-token')
  async query(@Body() body: RagQueryDto, @Req() request: any): Promise<any> {
    const user = request.user;

    return await this.ragService.query(body, user);

  }
}
