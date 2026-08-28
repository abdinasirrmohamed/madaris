export interface ApiMeta {
  current_page?: number;
  last_page?: number;
  total?: number;
  [key: string]: unknown;
}
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: ApiMeta;
}
