/**
 * Banking Grade Data Sanitizer & Form Rules for Admin Web Application
 * Protects financial records, member names, account codes, and receipts.
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
 * Check if a string contains emojis
 */
export function containsEmoji(input: string): boolean {
  if (typeof input !== 'string') return false;
  const regex = new RegExp(EMOJI_REGEX.source, 'g');
  return regex.test(input);
}

/**
 * Recursively sanitize all string properties in a form submission payload
 */
export function sanitizeFormData<T = any>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeFormData(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitizedObj[key] = sanitizeFormData(value);
    }
    return sanitizedObj as T;
  }

  return data;
}

/**
 * Ant Design Form Rule to block emojis & hidden characters in input fields
 */
export const noEmojiRule = {
  validator(_: any, value: any) {
    if (value && typeof value === 'string' && (containsEmoji(value) || ZERO_WIDTH_REGEX.test(value))) {
      return Promise.reject(new Error('Emojis, hidden symbols, or invalid characters are not allowed in official records'));
    }
    return Promise.resolve();
  },
};
