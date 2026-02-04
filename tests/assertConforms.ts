/**
 * Conformance assertions for cgdl-lib.
 *
 * Keep these checks deterministic:
 * - Node order must match graph.order exactly.
 * - Edges compared as sets (order-insensitive).
 * - Properties compared as plain objects (overwrite semantics).
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

  // Edges (order-insensitive compare)
  outgoing?: Array<{ cls: string; label: string }>;
  incoming?: Array<{ cls: string; label: string }>;

  // Stored non-structural lines (verbatim)
  lines?: Array<{ signal: string; text: string }>;
}

export interface ExpectedConformance {
  order: NodeKey[];
  nodes: ExpectedNode[];

  warnings?: string[]; // message-only
  errors?: string[];   // message-only
}

export function assertConforms(
  actual: { graph: CGGraph; diagnostics: Diagnostics },
  expected: ExpectedConformance
): void {
  const { graph, diagnostics } = actual;

  // 1) Order
  expect(graph.order).toEqual(expected.order);

  // 2) Nodes
  expect(expected.nodes.length).toBe(expected.order.length);

  for (const exp of expected.nodes) {
    const node = graph.getNodeByKey(exp.key);
    expect(node, `Missing node for key ${exp.key}`).toBeTruthy();
    if (!node) continue;

    if (exp.classDisplay !== undefined) expect(node.classNameDisplay).toBe(exp.classDisplay);
    if (exp.labelDisplay !== undefined) expect(node.labelDisplay).toBe(exp.labelDisplay);

    if (exp.properties) {
      const got: Record<string, string> = {};
      for (const [k, v] of node.properties.entries()) got[k] = v;
      expect(got).toEqual(exp.properties);
    }

    if (exp.outgoing) {
      expect(edgeSet(node.outgoing)).toEqual(edgeSet(exp.outgoing));
    }

    if (exp.incoming) {
      expect(edgeSet(node.incoming)).toEqual(edgeSet(exp.incoming));
    }

    if (exp.lines) {
      const got = node.lines.map((l) => ({ signal: l.signal, text: l.text }));
      expect(got).toEqual(exp.lines);
    }
  }

  // 3) Diagnostics (message-only)
  if (expected.warnings) {
    expect(diagnostics.warnings.map((w) => w.message)).toEqual(expected.warnings);
  }

  if (expected.errors) {
    expect(diagnostics.errors.map((e) => e.message)).toEqual(expected.errors);
  }
}

function edgeSet(edges: Array<{ cls: string; label: string }>): string[] {
  const s = edges.map((e) => `${e.cls}::${e.label}`);
  s.sort();
  return s;
}
