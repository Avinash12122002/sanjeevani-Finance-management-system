import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@sanjeevani/shared-types';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId =
      request.headers['x-request-id'] ||
      `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return next.handle().pipe(
      map((data) => {
        // If data already adheres to ApiResponse schema, return it
        if (data && typeof data === 'object' && 'success' in data && 'requestId' in data) {
          return data;
        }

        let message = 'Operation completed successfully';
        let payload = data;

        if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
          message = data.message;
          payload = data.data;
        }

        return {
          success: true,
          data: payload,
          message,
          requestId: String(requestId),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
