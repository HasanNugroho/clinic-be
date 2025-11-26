import { PaginationMetaDto, PaginationQueryDto } from '../dtos/pagination.dto';

export function generatePaginationMeta(
  total: number,
  pagin: PaginationQueryDto,
): PaginationMetaDto {
  const page = Math.max(1, pagin.page || 1);
  const limit = Math.max(1, pagin.limit || 10);
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page * limit < total,
  };
}
