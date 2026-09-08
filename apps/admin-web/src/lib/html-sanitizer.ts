/**
 * HTML Entity Sanitizer for Banking Print Views & Document Templates
 * Mitigates Stored & Reflected Cross-Site Scripting (XSS) (OWASP A03:2021)
 */

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Mask statutory Aadhaar numbers per UIDAI & RBI banking KYC privacy rules
 * Transforms '123456789012' -> 'XXXX-XXXX-9012'
 */
export function maskAadhaar(aadhaar?: string): string {
  if (!aadhaar) return 'Not Provided';
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length >= 4) {
    return `XXXX-XXXX-${clean.slice(-4)}`;
  }
  return aadhaar.includes('XXXX') ? aadhaar : 'XXXX-XXXX-••••';
}

/**
 * Mask statutory PAN numbers per IT & banking guidelines
 * Transforms 'ABCDE1234F' -> 'XXXXX1234F'
 */
export function maskPan(pan?: string): string {
  if (!pan) return 'Not Provided';
  const clean = pan.trim().toUpperCase();
  if (clean.length === 10) {
    return `XXXXX${clean.slice(5)}`;
  }
  return pan;
}
