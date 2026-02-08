/**
 * Conformance assertions for cgdl-lib.
 *
 * Deterministic checks (order-free by design):
 * - No node order checks (graph is unordered).
 * - Edges compared as sets of NodeKey strings (order-insensitive).
 * - Properties compared as plain objects (overwrite semantics).
 * - Lines compared in stored order (lines are sequences).
 * - Diagnostics compared by message (stable and readable).
 */

import { expect } from "vitest";
import type { NodeKey } from "../src/types";
import type { CGGraph } from "../src/model/CGGraph";
import type { Diagnostics } from "../src/reader/Diagnostics";

export interface ExpectedNode {
  key: NodeKey;

  // Optional display expectations
  classDisplay?: string;
  labelDisplay?: string;

  // Exact properties after overwrite semantics
  properties?: Record<string, string>;

  // Edges are stored as unordered sets of NodeKey strings:
  // - outgoing keys are TARGET node keys (to)
  // - incoming keys are SOURCE node keys (from)
  outgoingKeys?: NodeKey[];
  incomingKeys?: NodeKey[];

  // Stored non-structural lines (verbatim)
  lines?: Array<{ signal: string; text: string }>;
}

export interface ExpectedConformance {
  nodes: ExpectedNode[];

  warnings?: string[]; // message-only
  errors?: string[];   // message-only
}

export function assertConforms(
  actual: { graph: CGGraph; diagnostics: Diagnostics },
  expected: ExpectedConformance
): void
{
  const graph = actual.graph;
  const diagnostics = actual.diagnostics;

  for (const exp of expected.nodes)
  {
    const node = graph.getNodeByKey(exp.key);
    expect(node, `Missing node for key ${exp.key}`).toBeTruthy();
    if (!node) continue;

    if (exp.classDisplay !== undefined)
      expect(node.classNameDisplay).toBe(exp.classDisplay);

    if (exp.labelDisplay !== undefined)
      expect(node.labelDisplay).toBe(exp.labelDisplay);

    if (exp.properties)
    {
      const got: Record<string, string> = {};
      for (const [k, v] of node.properties.entries())
        got[k] = v;

      expect(got).toEqual(exp.properties);
    }

    if (exp.outgoingKeys !== undefined)
    {
      expect(keySet(node._outgoingSet)).toEqual(keySet(exp.outgoingKeys));
    }

    if (exp.incomingKeys !== undefined)
    {
      expect(keySet(node._incomingSet)).toEqual(keySet(exp.incomingKeys));
    }

    if (exp.lines)
    {
      const got = node.lines.map((l) => ({ signal: l.signal, text: l.text }));
      expect(got).toEqual(exp.lines);
    }
  }

  if (expected.warnings)
    expect(diagnostics.warnings.map((w) => w.message)).toEqual(expected.warnings);

  if (expected.errors)
    expect(diagnostics.errors.map((e) => e.message)).toEqual(expected.errors);
}

function keySet(keys: Iterable<string>): string[]
{
  const arr = Array.from(keys);
  arr.sort();
  return arr;
}
