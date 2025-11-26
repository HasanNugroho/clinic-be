import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination.dto';

export class HttpResponse<T> {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    statusCode: number;

    @ApiProperty({ type: String, isArray: false })
    message: string | string[];

    @ApiProperty({ required: false })
    data?: T;

    @ApiPropertyOptional({ type: () => PaginationMetaDto })
    meta?: PaginationMetaDto;

    constructor(
        statusCode: number,
        success: boolean,
        message: string | string[],
        data?: T,
        meta?: PaginationMetaDto,
    ) {
        this.statusCode = statusCode;
        this.success = success;
        this.message = message;
        this.data = data;
        this.meta = meta;
    }
}
