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