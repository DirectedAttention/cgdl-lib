/**
 * Core parsers for cgdl-lib graph-building subset.
 *
 * Commands implemented:
 * A) Class block control:
 *   - "[[ ClassName ]]" => open/reopen class; clears current node
 *   - "[[ ]]"           => close class; clears class and node
 *
 * B) Node control:
 *   - "## Label" => select/create node in current class
 *   - "##"       => close node only
 *
 * C) Edge declaration (from effective node):
 *   - "OtherClass : TargetLabel" (spaces around ':' optional)
 *
 * D) Property:
 *   - "{} key = value" (parsed elsewhere; this parser handles key/value split)
 */

import { trimOne } from "../utils/strings";

export function parseClassOpenOrClose(
  line: string
): { kind: "ClassOpen"; className: string } | { kind: "ClassClose" } | null
{
  const t = trimOne(line);

  // Close forms
  if (t === "[[ ]]" || t === "[[]]" || t === "[[ ]]")
  {
    return { kind: "ClassClose" };
  }

  if (!t.startsWith("[["))
    return null;
  if (!t.endsWith("]]"))
    return null;

  const inside = trimOne(t.slice(2, t.length - 2));
  if (inside.length === 0)
    return { kind: "ClassClose" };
  else
    return { kind: "ClassOpen", className: inside };
}

export function parseNodeHeader(
  line: string
): { kind: "NodeOpen"; label: string } | { kind: "NodeClose" } | null
{
  const t = trimOne(line);
  if (!t.startsWith("##"))
    return null;

  const rest = trimOne(t.slice(2));

  if (rest.length === 0)
    return { kind: "NodeClose" };
  else
    return { kind: "NodeOpen", label: rest };
}

export function parseOutgoingEdge(line: string): { cls: string; label: string } | null
{
  const t = trimOne(line);
  const idx = t.indexOf(":");
  if (idx < 0)
    return null;

  const left = trimOne(t.slice(0, idx));
  const right = trimOne(t.slice(idx + 1));

  if (!left || !right)
    return null;
  else
    return { cls: left, label: right };
}

export function parsePropertyText(text: string): { key: string; value: string } | null
{
  const t = trimOne(text);
  const idx = t.indexOf("=");
  if (idx < 0)
    return null;

  const key = trimOne(t.slice(0, idx));
  const value = trimOne(t.slice(idx + 1));

  if (!key)
    return null;

  return { key, value };
}

