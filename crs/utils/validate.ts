/**
 * Validation rules from your spec:
 *
 * - ClassName and Label must NOT contain any digraph (two consecutive) of non-alnum chars,
 *   except where at least one of the two chars is in the allowed set:
 *     space ' ', hyphen '-', apostrophe '\''
 *
 * Examples:
 * - "Hello, world"    OK     (", " is comma then space; space is allowed)
 * - "bad::label"      NOT OK (':' + ':' ; neither is allowed)
 * - "what?!"          NOT OK ('?' + '!' ; neither is allowed)
 */

import { isAlnum } from "./strings";

const ALLOWED_NONALNUM = new Set<string>([" ", "-", "'"]);

export function hasForbiddenNonAlnumDigraph(s: string): boolean {
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i]!;
    const b = s[i + 1]!;
    const aNon = !isAlnum(a);
    const bNon = !isAlnum(b);

    if (aNon && bNon) {
      const ok = ALLOWED_NONALNUM.has(a) || ALLOWED_NONALNUM.has(b);
      if (!ok) return true;
    }
  }
  return false;
}

/**
 * Returns "" if valid; otherwise returns an error message.
 */
export function validateClassOrLabel(s: string): string | "" {
  if (s.trim().length === 0) return "Value may not be empty.";
  if (hasForbiddenNonAlnumDigraph(s)) return "Contains forbidden consecutive non-alphanumeric characters.";
  return "";
}
