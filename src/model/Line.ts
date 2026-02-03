/**
 * Line record preserved for CLI / protocol layer.
 * cgdl-lib does NOT interpret protocol behaviors.
 *
 * signal:
 * - "" if no two-char non-alnum prefix at column 0
 * - otherwise the first two chars (e.g. "!!", "@!", "!@", "??", "//", "{{", "}}", etc.)
 *
 * text:
 * - the full original line (verbatim)
 */

import { isAlnum } from "../utils/strings";

export class Line {
  public readonly signal: string;
  public readonly text: string;

  public constructor(text: string) {
    this.text = text;
    this.signal = detectTwoCharSignal(text);
  }
}

function detectTwoCharSignal(text: string): string {
  // Signals must be at column 0 (no leading whitespace).
  if (text.length < 2) return "";
  const a = text[0]!;
  const b = text[1]!;
  if (!isAlnum(a) && !isAlnum(b)) return a + b;
  return "";
}

