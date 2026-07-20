import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = (ctx.getRequest() as { requestId?: string }).requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string) || message;
        code = (obj.code as string) || code;
        details = obj.details as Record<string, unknown> | undefined;
        if (Array.isArray(obj.message)) {
          message = 'Validation failed';
          details = { errors: obj.message };
          code = 'VALIDATION_ERROR';
        }
      }
      if (status === HttpStatus.UNAUTHORIZED) code = code === 'INTERNAL_ERROR' ? 'UNAUTHORIZED' : code;
      if (status === HttpStatus.FORBIDDEN) code = code === 'INTERNAL_ERROR' ? 'FORBIDDEN' : code;
      if (status === HttpStatus.NOT_FOUND) code = code === 'INTERNAL_ERROR' ? 'NOT_FOUND' : code;
      if (status === HttpStatus.CONFLICT) code = code === 'INTERNAL_ERROR' ? 'CONFLICT' : code;
      if (status === HttpStatus.BAD_REQUEST) code = code === 'INTERNAL_ERROR' ? 'BAD_REQUEST' : code;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack, requestId);
    }

    response.status(status).json({
      success: false,
      error: { code, message, details },
      meta: requestId ? { requestId } : undefined,
    });
  }
}
