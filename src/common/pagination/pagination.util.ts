import { PaginationQueryDto } from './pagination.dto';
import { PaginationParams, PaginatedResponse } from './pagination.interface';

/**
 * 解析分页参数，返回 page、pageSize、skip
 * @param page 页码，从 1 开始，默认 1
 * @param pageSize 每页数量，默认 10
 * @returns PaginationParams
 */
export function parsePaginationParams({
  page = 1,
  pageSize = 10,
}: PaginationQueryDto): PaginationParams {
  const p = Math.max(1, Math.floor(page));
  const ps = Math.max(1, Math.min(100, Math.floor(pageSize)));
  return {
    page: p,
    pageSize: ps,
    skip: (p - 1) * ps,
  };
}

/**
 * 构建分页返回格式
 * @param data 数据列表
 * @param total 总数据量
 * @param page 当前页码
 * @param pageSize 每页数量
 * @returns 固定格式的分页响应
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pageSize) || 1;
  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  };
}
