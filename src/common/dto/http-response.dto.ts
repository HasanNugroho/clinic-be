import { ApiProperty } from '@nestjs/swagger';

export class HttpResponse<T> {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    statusCode: number;

    @ApiProperty({ type: 'string', isArray: true })
    message: string | string[];

    @ApiProperty({ required: false })
    data?: T;

    @ApiProperty({ required: false })
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