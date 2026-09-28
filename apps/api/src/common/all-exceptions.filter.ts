import { randomUUID } from 'node:crypto';

import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Request, type Response } from 'express';

import { type AppConfig } from '../config/configuration';

import { CORRELATION_ID_HEADER } from './constants';

/** Uniform JSON error body returned to clients (SPEC §5). */
interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  correlationId: string;
  path: string;
  timestamp: string;
}

/**
 * Global exception filter producing a uniform error envelope
 * `{ statusCode, message, error, correlationId }`. Stack traces are logged
 * server-side but never leaked to clients; in production the message for
 * unexpected 5xx errors is generic.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers[CORRELATION_ID_HEADER] as string | undefined) ?? randomUUID();

    const { status, message, error } = this.describe(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${correlationId}] ${request.method} ${request.url} → ${status}`);
    }

    const isProduction = this.config.get('isProduction', { infer: true });
    const safeMessage =
      isProduction && status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Se ha producido un error interno'
        : message;

    const body: ErrorResponseBody = {
      statusCode: status,
      message: safeMessage,
      error,
      correlationId,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    response.status(status).json(body);
  }

  private describe(exception: unknown): {
    status: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { status, message: res, error: exception.name };
      }
      const payload = res as { message?: string | string[]; error?: string };
      return {
        status,
        message: payload.message ?? exception.message,
        error: payload.error ?? exception.name,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Se ha producido un error interno',
      error: 'InternalServerError',
    };
  }
}
