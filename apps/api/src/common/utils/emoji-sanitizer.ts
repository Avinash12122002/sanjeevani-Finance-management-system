/**
 * Banking Grade Data Sanitizer & Unicode Normalizer
 * Strips emojis, zero-width spaces, BiDi control characters, and trims whitespace.
 */

// Universal Surrogate-Pair & Dingbat Emoji Regex
export const EMOJI_REGEX =
  /([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2300-\u23FF]|[\u2B50\u2B55\u200D\uFE00-\uFE0F\u20E3]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF])/g;

// Invisible Zero-Width, Word-Joiner, Soft-Hyphen, and BiDi override characters
export const ZERO_WIDTH_REGEX = /[\u200B-\u200D\u2060\uFEFF\u00AD\u202A-\u202E\u2066-\u2069]/g;

/**
 * Remove emojis, zero-width characters, and trim whitespace
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    .replace(EMOJI_REGEX, '')
    .replace(ZERO_WIDTH_REGEX, '')
    .trim();
}

/**
 * Alias for backward compatibility
 */
export const stripEmojis = sanitizeString;

/**
 * Check whether a string contains any emoji character
 */
export function containsEmoji(input: string): boolean {
  if (typeof input !== 'string') return false;
  const regex = new RegExp(EMOJI_REGEX.source, 'g');
  return regex.test(input);
}

/**
 * Recursively sanitize all string properties in an object, array, or primitive
 */
export function deepSanitizeEmojis<T = any>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => deepSanitizeEmojis(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitizedObj[key] = deepSanitizeEmojis(value);
    }
    return sanitizedObj as T;
  }

  return data;
}
