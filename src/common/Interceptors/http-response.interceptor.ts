import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { HttpResponse } from '../dtos/response.dto';
import { PaginationMetaDto } from '../dtos/pagination.dto';

@Injectable()
export class HttpResponseInterceptor<T>
    implements NestInterceptor<T, HttpResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler<T>,
    ): Observable<HttpResponse<T>> {
        return next.handle().pipe(
            map((result: any) => {
                const statusCode =
                    context.switchToHttp().getResponse().statusCode ?? 200;

                if (result instanceof HttpResponse) return result;

                const data = result?.data ?? result;
                const meta: PaginationMetaDto | undefined = result?.meta;

                return new HttpResponse(statusCode, true, 'Success', data, meta);
            }),
        );
    }
}
