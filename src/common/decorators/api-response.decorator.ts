import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { HttpResponse } from '../dtos/response.dto';

/**
 * Decorator to wrap API responses with HttpResponse format
 * Automatically generates Swagger schema with success/statusCode/message/data structure
 */
export function ApiHttpResponse<T extends Type<any>>(
  statusCode: number,
  description: string,
  dataType?: T,
) {
  const isSuccess = statusCode >= 200 && statusCode < 300;

  const schemaObject: any = {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: isSuccess,
        description: 'Indicates if the request was successful',
      },
      statusCode: {
        type: 'number',
        example: statusCode,
        description: 'HTTP status code',
      },
      message: {
        type: 'string',
        example: description,
        description: 'Response message',
      },
      meta: {
        type: 'object',
        nullable: true,
        example: null,
        description: 'Optional metadata',
      },
    },
    required: ['success', 'statusCode', 'message'],
  };

  if (dataType) {
    schemaObject.properties.data = {
      allOf: [{ $ref: getSchemaPath(dataType) }],
      description: 'Response data',
    };
    schemaObject.required.push('data');
  } else {
    schemaObject.properties.data = {
      type: 'object',
      nullable: true,
      example: null,
      description: 'Response data',
    };
  }

  return applyDecorators(
    ApiResponse({
      status: statusCode,
      description,
      schema: schemaObject,
    }),
  );
}

/**
 * Decorator for array responses wrapped in HttpResponse
 */
export function ApiHttpArrayResponse<T extends Type<any>>(
  statusCode: number,
  description: string,
  dataType: T,
) {
  const isSuccess = statusCode >= 200 && statusCode < 300;

  const schemaObject: any = {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: isSuccess,
        description: 'Indicates if the request was successful',
      },
      statusCode: {
        type: 'number',
        example: statusCode,
        description: 'HTTP status code',
      },
      message: {
        type: 'string',
        example: description,
        description: 'Response message',
      },
      data: {
        type: 'array',
        items: {
          $ref: `#/components/schemas/${dataType.name}`,
        },
        description: 'Array of items',
      },
      meta: {
        type: 'object',
        nullable: true,
        example: null,
        description: 'Optional metadata',
      },
    },
    required: ['success', 'statusCode', 'message', 'data'],
  };

  return applyDecorators(
    ApiResponse({
      status: statusCode,
      description,
      schema: schemaObject,
    }),
  );
}

/**
 * Decorator for paginated responses wrapped in HttpResponse
 */
export function ApiHttpPaginatedResponse<T extends Type<any>>(
  statusCode: number,
  description: string,
  dataType: T,
) {
  const schemaObject: any = {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
        description: 'Indicates if the request was successful',
      },
      statusCode: {
        type: 'number',
        example: statusCode,
        description: 'HTTP status code',
      },
      message: {
        type: 'string',
        example: description,
        description: 'Response message',
      },
      data: {
        type: 'array',
        items: {
          $ref: `#/components/schemas/${dataType.name}`,
        },
        description: 'Array of items',
      },
      meta: {
        type: 'object',
        description: 'Pagination metadata',
        properties: {
          page: { type: 'number', example: 1, description: 'Current page number' },
          limit: { type: 'number', example: 10, description: 'Items per page' },
          total: { type: 'number', example: 100, description: 'Total items count' },
          totalPages: { type: 'number', example: 10, description: 'Total pages' },
          hasPrevPage: { type: 'boolean', example: false, description: 'Has previous page' },
          hasNextPage: { type: 'boolean', example: true, description: 'Has next page' },
        },
        required: ['page', 'limit', 'total', 'totalPages', 'hasPrevPage', 'hasNextPage'],
      },
    },
    required: ['success', 'statusCode', 'message', 'data', 'meta'],
  };

  return applyDecorators(
    ApiResponse({
      status: statusCode,
      description,
      schema: schemaObject,
    }),
  );
}

/**
 * Decorator for error responses
 */
export function ApiHttpErrorResponse(
  statusCode: number,
  description: string,
) {
  const schemaObject: any = {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
        description: 'Indicates if the request was successful',
      },
      statusCode: {
        type: 'number',
        example: statusCode,
        description: 'HTTP status code',
      },
      message: {
        type: 'string',
        example: description,
        description: 'Error message',
      },
      data: {
        type: 'object',
        nullable: true,
        example: null,
        description: 'Error data (usually null)',
      },
      meta: {
        type: 'object',
        nullable: true,
        example: null,
        description: 'Error metadata (usually null)',
      },
    },
    required: ['success', 'statusCode', 'message'],
  };

  return applyDecorators(
    ApiResponse({
      status: statusCode,
      description,
      schema: schemaObject,
    }),
  );
}