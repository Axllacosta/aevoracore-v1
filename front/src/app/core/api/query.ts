import { HttpParams } from '@angular/common/http';
export type Query = Record<string, string | number | boolean | null | undefined>;
export function queryParams(query: Query): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query))
    if (value !== null && value !== undefined && value !== '') params = params.set(key, value);
  return params;
}
