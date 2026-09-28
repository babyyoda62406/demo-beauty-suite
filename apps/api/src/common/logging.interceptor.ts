import { randomUUID } from 'node:crypto';

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { type Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { CORRELATION_ID_HEADER } from './constants';

/**
 * Logs one line per request with method, path, status and latency, tagging each
 * with a correlation id (reused from the incoming header or freshly minted).
 * Sensitive payloads (bodies, tokens, passwords) are deliberately never logged
 * (SPEC §5).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const correlationId =
      (request.headers[CORRELATION_ID_HEADER] as string | undefined) ?? randomUUID();
    request.headers[CORRELATION_ID_HEADER] = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    const startedAt = Date.now();
    const { method, url } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - startedAt;
          this.logger.log(`[${correlationId}] ${method} ${url} → ${response.statusCode} (${ms}ms)`);
        },
        error: () => {
          const ms = Date.now() - startedAt;
          this.logger.warn(`[${correlationId}] ${method} ${url} → error (${ms}ms)`);
        },
      }),
    );
  }
}
