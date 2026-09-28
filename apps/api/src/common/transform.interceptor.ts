import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Standard success envelope wrapping every handler's return value. */
export interface ApiResponse<T> {
  data: T;
}

/** Type guard: value already carries a `data`/`meta` envelope (e.g. paginated). */
function isEnvelope(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('data' in value || 'meta' in value)
  );
}

/**
 * Wraps handler results in `{ data }` for a consistent client contract, while
 * leaving already-enveloped responses (paginated results, custom envelopes) and
 * empty bodies untouched.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((value): ApiResponse<T> | T => {
        if (value === undefined || value === null || isEnvelope(value)) {
          return value;
        }
        return { data: value };
      }),
    );
  }
}
