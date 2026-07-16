export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return meta ? { success: true, data, meta } : { success: true, data };
}

export function fail(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ApiError {
  return {
    success: false,
    error: { code, message, details },
  };
}
