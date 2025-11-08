import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as util from 'util';
import { HttpResponse } from '../dto/http-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name)

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const { status, message } = this.resolveExceptionData(exception);

        const errorResponse = new HttpResponse(status, false, message, undefined);

        response.status(status).json(errorResponse);
    }

    resolveExceptionData(exception: any): { status: number; message: string } {
        const defaultStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        const defaultMessage = 'Internal server error';

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const res = exception.getResponse();

            if (status === 500) {
                return { status, message: defaultMessage };
            }

            // Handle cases where `getResponse()` is an object with a message
            if (typeof res === 'object' && res !== null) {
                const msg =
                    (res as any).message ??
                    (Array.isArray((res as any).errors)
                        ? (res as any).errors.join(', ')
                        : JSON.stringify(res));
                return { status, message: msg };
            }

            return { status, message: String(res) };
        }

        const errorWithMessage = exception as { message?: unknown };
        let message: string;

        if (typeof errorWithMessage?.message === 'string') {
            message = errorWithMessage.message;
        } else if (Array.isArray(errorWithMessage?.message)) {
            message = errorWithMessage.message.join(', ');
        } else if (typeof errorWithMessage?.message === 'object') {
            message = JSON.stringify(errorWithMessage.message);
        } else {
            message = defaultMessage;
        }

        this.logger.error?.(`Unhandled exception: ${util.inspect(exception, { depth: null })}`);

        return {
            status: defaultStatus,
            message,
        };
    }
}