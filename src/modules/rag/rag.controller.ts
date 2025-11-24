import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiHttpResponse, ApiHttpErrorResponse } from '../../common/decorators/api-response.decorator';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class RagQueryDto {
    @ApiProperty({
        description: 'Search query in natural language',
        example: 'hypertension treatment',
    })
    @IsString()
    query: string;

    @ApiProperty({
        description: 'Maximum number of results to return (default: 5, max: 20)',
        example: 5,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    limit?: number = 5;
}

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
     * - Employee/Superadmin: Can search all data
     */
    @Post('query')
    @ApiOperation({
        summary: 'Query RAG system with vector similarity search',
    })
    @ApiHttpResponse(200, 'Query results retrieved successfully')
    @ApiHttpErrorResponse(400, 'Invalid query - query string is required')
    @ApiHttpErrorResponse(401, 'Unauthorized - JWT token required')
    @ApiHttpErrorResponse(500, 'Server error - embedding generation failed')
    @ApiBearerAuth('access-token')
    async query(
        @Body() body: RagQueryDto,
        @Req() request: any,
    ): Promise<any> {
        const { query, limit = 5 } = body;
        const user = request.user;

        const results = await this.ragService.query(
            query,
            user.role,
            user.sub,
            limit,
        );

        return {
            success: true,
            statusCode: 200,
            message: 'Query results retrieved successfully',
            data: results,
            meta: {
                query,
                resultCount: results.length,
                limit,
            },
        };
    }

    /**
     * Health check for RAG system
     */
    @Get('health')
    @ApiOperation({
        summary: 'Health check for RAG system',
        description: 'Check if RAG system is operational',
    })
    @ApiHttpResponse(200, 'RAG system is healthy')
    async healthCheck(): Promise<any> {
        const health = await this.ragService.healthCheck();

        return {
            success: true,
            statusCode: 200,
            message: 'RAG system is healthy',
            data: health,
        };
    }
}
