import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token = '';
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]?.trim() || '';
    } else if (
      request.query &&
      typeof request.query.token === 'string' &&
      request.path?.includes('/documents/file/')
    ) {
      // Allow only for direct binary document media streaming
      token = request.query.token.trim();
    }

    if (!token) {
      throw new UnauthorizedException('Authentication session expired or token missing. Please sign in with Bearer token.');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = {
        ...payload,
        id: payload.id || payload.sub,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token. Please sign in again.');
    }
  }
}
