import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { HttpResponse } from '../dtos/response.dto';
import { PaginationMetaDto } from '../dtos/pagination.dto';

/**
 * Decorator for single object responses
 * @param statusCode HTTP status code
 * @param message Response message
 * @param model Data model type
 */
export const ApiHttpResponse = <TModel extends Type<any>>(
  statusCode: number = 200,
  message: string = 'Success',
  model?: TModel,
) => {
  const dataSchema = model
    ? { $ref: getSchemaPath(model) }
    : { type: 'null' };

  return applyDecorators(
    model ? ApiExtraModels(HttpResponse, model) : ApiExtraModels(HttpResponse),
    ApiResponse({
      status: statusCode,
      schema: {
        allOf: [
          { $ref: getSchemaPath(HttpResponse) },
          {
            properties: {
              success: { example: true },
              statusCode: { example: statusCode },
              message: { example: message },
              data: dataSchema,
              meta: { type: 'null', example: null },
            },
          },
        ],
      },
    }),
  );
};

/**
 * Decorator for array responses
 * @param statusCode HTTP status code
 * @param message Response message
 * @param model Data model type
 */
export const ApiHttpArrayResponse = <TModel extends Type<any>>(
  statusCode: number = 200,
  message: string = 'Success',
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(HttpResponse, model),
    ApiResponse({
      status: statusCode,
      schema: {
        allOf: [
          { $ref: getSchemaPath(HttpResponse) },
          {
            properties: {
              success: { example: true },
              statusCode: { example: statusCode },
              message: { example: message },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: { type: 'null', example: null },
            },
          },
        ],
      },
    }),
  );
};

/**
 * Decorator for paginated responses
 * @param statusCode HTTP status code
 * @param message Response message
 * @param model Data model type
 */
export const ApiHttpPaginatedResponse = <TModel extends Type<any>>(
  statusCode: number = 200,
  message: string = 'Success',
  model?: TModel,
) => {
  const dataSchema = model
    ? {
      type: 'array',
      items: { $ref: getSchemaPath(model) },
    }
    : { type: 'null' };

  return applyDecorators(
    ApiExtraModels(HttpResponse, PaginationMetaDto, ...(model ? [model] : [])),
    ApiResponse({
      status: statusCode,
      schema: {
        allOf: [
          { $ref: getSchemaPath(HttpResponse) },
          {
            properties: {
              success: { example: true },
              statusCode: { example: statusCode },
              message: { example: message },
              data: dataSchema,
              meta: {
                oneOf: [{ $ref: getSchemaPath(PaginationMetaDto) }, { type: 'null' }],
              },
            },
          },
        ],
      },
    }),
  );
};

/**
 * Decorator for error responses
 * @param statusCode HTTP status code
 * @param message Error message
 */
export const ApiHttpErrorResponse = (
  statusCode: number = 400,
  message: string = 'Error',
) => {
  return ApiResponse({
    status: statusCode,
    schema: {
      allOf: [
        { $ref: getSchemaPath(HttpResponse) },
        {
          properties: {
            success: { example: false },
            statusCode: { example: statusCode },
            message: { example: message },
            data: { type: 'null', example: null },
            meta: { type: 'null', example: null },
          },
        },
      ],
    },
  });
};
