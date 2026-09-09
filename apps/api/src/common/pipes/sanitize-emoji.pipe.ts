import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { deepSanitizeEmojis } from '../utils/emoji-sanitizer';

@Injectable()
export class SanitizeEmojiPipe implements PipeTransform {
  transform(value: any, _metadata?: ArgumentMetadata) {
    if (!value) return value;
    return deepSanitizeEmojis(value);
  }
}
