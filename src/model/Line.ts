// src/model/Line.ts
//
// Line is the fundamental “preserved” unit of CGDL.
// cgdl-lib interprets only a small graph-building subset of signals.
// Most signals are preserved for higher layers (CLI / protocol).
//
// Signal extraction rule (frozen for cgdl-lib):
// - Ignore leading whitespace (left-trim only for detection).
// - If the first two non-whitespace chars are BOTH punctuation,
//   and neither char is one of: '-', ''', '_' then the line has a 2-char Signal.
// - Otherwise, the line has signal == "" and the entire left-trimmed line is text.
// - After splitting, text is display-normalized via normalizeDisplay().

import { normalizeDisplay } from "../utils/normalize";

export class Line {
  public readonly signal: string; // "" or 2 chars
  public readonly text: string;   // normalized display text (may be "")

  public constructor(signal: string, text: string) {
    this.signal = signal;
    this.text = text;
  }

  /// <summary>
  /// Parses a raw CGDL line into {signal, text}.
  /// Leading whitespace is ignored for signal detection.
  /// Text is normalized (trim + collapse whitespace runs), preserving case.
  /// </summary>
  public static parse(rawLine: string): Line {
    const split = Line.splitSignal(rawLine);
    return new Line(split.signal, normalizeDisplay(split.text));
  }

  /// <summary>
  /// Split only. Does NOT normalize whitespace in text.
  /// </summary>
  public static splitSignal(rawLine: string): { signal: string; text: string } {
    // Left-trim only for signal detection.
    const s: string = rawLine.replace(/^\s+/, "");

    if (s.length >= 2) {
      const a: string = s[0];
      const b: string = s[1];

      if (Line.isCommandPunct(a) && Line.isCommandPunct(b)) {
        // Keep the remainder as-is here; parse() will normalize via normalizeDisplay().
        return { signal: a + b, text: s.slice(2) };
      }
    }

    return { signal: "", text: s };
  }

  /// <summary>
  /// Returns true iff ch is allowed to participate in a 2-char CGDL signal.
  /// Excludes '-', ''', '_' by design.
  /// Excludes alnum and whitespace.
  /// Everything else counts as punctuation for signal purposes.
  /// </summary>
  private static isCommandPunct(ch: string): boolean {
    if (ch.length !== 1) return false;

    // Exclusions: treated as “word-ish” characters, never command punctuation.
    if (ch === "-" || ch === "'" || ch === "_") return false;

    // Never whitespace
    if (/\s/.test(ch)) return false;

    // Never alphanumeric
    if (/[A-Za-z0-9]/.test(ch)) return false;

    return true;
  }
}
