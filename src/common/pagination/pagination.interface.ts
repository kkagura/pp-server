/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

/**
 * 分页返回格式（固定格式，供前端使用）
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
