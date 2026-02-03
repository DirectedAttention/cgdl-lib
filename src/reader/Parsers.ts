/**
 * Core parsers for cgdl-lib graph-building subset.
 *
 * Commands implemented:
 * A) Class block control:
 *   - "[[ ClassName ]]" => open/reopen class; clears current node
 *   - "[[ ]]" / "]]"    => close class; clears class and node
 *
 * B) Node control:
 *   - "## Label" => select/create node in current class
 *   - "[]"       => close node only
 *
 * C) Edge declaration (from current node):
 *   - "OtherClass : TargetLabel" (spaces around ':' optional)
 *   - optional ": TargetLabel" (same-class shorthand) if enabled
 */

import { trimOne } from "../utils/strings";

export function parseClassOpenOrClose(
  line: string
): { kind: "ClassOpen"; className: string } | { kind: "ClassClose" } | null {
  const t = trimOne(line);

  // Close forms
  if (t === "]]" || t === "[[ ]]" || t === "[[]]" || t === "[[ ]]") {
    return { kind: "ClassClose" };
  }

  if (!t.startsWith("[[")) return null;
  if (!t.endsWith("]]")) return null;

  const inside = trimOne(t.slice(2, t.length - 2));
  if (inside.length === 0) return { kind: "ClassClose" };

  return { kind: "ClassOpen", className: inside };
}

export function parseNodeHeader(line: string): { label: string } | null {
  if (!line.startsWith("##")) return null;
  const label = trimOne(line.slice(2));
  if (label.length === 0) return null;
  return { label };
}

export function isCloseNodeLine(line: string): boolean {
  return trimOne(line) === "[]";
}

export function parseOutgoingEdge(line: string): { cls: string; label: string } | null {
  // pattern: OtherClass : TargetLabel
  const t = trimOne(line);
  const idx = t.indexOf(":");
  if (idx < 0) return null;

  const left = trimOne(t.slice(0, idx));
  const right = trimOne(t.slice(idx + 1));
  if (!left || !right) return null;

  return { cls: left, label: right };
}

export function parseSameClassEdgeShorthand(line: string): { label: string } | null {
  const t = trimOne(line);
  if (!t.startsWith(":")) return null;
  const right = trimOne(t.slice(1));
  if (!right) return null;
  return { label: right };
}

export function parseProperty(line: string): { key: string; value: string } | null {
  const t = trimOne(line);
  const idx = t.indexOf("=");
  if (idx < 0) return null;

  const key = trimOne(t.slice(0, idx));
  const value = trimOne(t.slice(idx + 1));
  if (!key) return null;

  return { key, value };
}



