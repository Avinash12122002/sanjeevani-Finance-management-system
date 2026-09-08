import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '@sanjeevani/shared-types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'An unexpected server error occurred';
    let code = 'INTERNAL_ERROR';
    let details: any = undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const resObj = exceptionResponse as any;
      message = Array.isArray(resObj.message)
        ? resObj.message.join(', ')
        : resObj.message || message;
      code = resObj.error || `HTTP_${status}`;
      details = resObj.details || undefined;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const requestId =
      request.headers['x-request-id'] ||
      `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Sanitize message to prevent database details or credentials from leaking
    if (typeof message === 'string') {
      message = message.replace(/(postgres|postgresql|mysql|mongodb):\/\/[^\s]+/gi, '[REDACTED_DB_URI]');
      message = message.replace(/password\s*=\s*['"][^'"]+['"]/gi, 'password=[REDACTED]');
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${exception instanceof Error ? exception.stack || exception.message : exception}`,
      );
      if (
        process.env.NODE_ENV === 'production' ||
        /relation ".*" does not exist|syntax error at or near|duplicate key value/i.test(message)
      ) {
        message = `An internal financial processing error occurred. Please contact system support with request ID ${requestId}.`;
        details = undefined;
      }
    }

    const errorPayload: ApiResponse = {
      success: false,
      requestId: String(requestId),
      timestamp: new Date().toISOString(),
      error: {
        code,
        message,
        details,
      },
    };

    response.status(status).json(errorPayload);
  }
}
