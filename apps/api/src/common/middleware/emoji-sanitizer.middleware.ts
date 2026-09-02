import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { deepSanitizeEmojis } from '../utils/emoji-sanitizer';

@Injectable()
export class EmojiSanitizerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitizeEmojis(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = deepSanitizeEmojis(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = deepSanitizeEmojis(req.params);
    }
    next();
  }
}
