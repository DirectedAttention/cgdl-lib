/**
 * Normalization rules for class names and labels:
 * - trim
 * - collapse any whitespace run into a single space (space, tab, etc.)
 * - lower-case (for keying and equality)
 */

export function normalizeKeyPart(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Display normalization:
 * - trim
 * - collapse whitespace runs
 * - preserve case
 */
export function normalizeDisplay(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}
