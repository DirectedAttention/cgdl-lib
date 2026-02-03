/**
 * The CGDL Reader:
 * - line-by-line builder for interactive graph construction
 * - implements only core graph-building commands
 * - does not interpret protocol behaviors (it may detect Line.signal)
 */

import type { ReaderOptions } from "./ReaderOptions";
import { ReaderState } from "./ReaderState";
import { Diagnostics } from "./Diagnostics";
import { CGGraph } from "../model/CGGraph";
import { splitLines, trimOne } from "../utils/strings";
import {
  parseClassDirective,
  parseNodeHeader,
  isCloseNodeLine,
  parseIncomingEdge,
  parseOutgoingEdge,
  parseProperty,
  validateClassNameOrLabelOrEmpty,
} from "./Parsers";

export interface ReadResult {
  graph: CGGraph;
  state: ReaderState;
  diagnostics: Diagnostics;
}

/**
 * Convenience: read whole text (still uses the single-line reader internally).
 */
export function readText(text: string, options?: ReaderOptions): ReadResult {
  const opt: Required<ReaderOptions> = {
    defaultClass: options?.defaultClass ?? "text",
    strict: options?.strict ?? true,
  };

  const graph = new CGGraph();
  const state = new ReaderState(opt.defaultClass);
  const diagnostics = new Diagnostics();

  const lines = splitLines(text);

  for (let i = 0; i < lines.length; i++) {
    readLine(graph, state, diagnostics, lines[i]!, i + 1, opt);
  }

  return { graph, state, diagnostics };
}

/**
 * Core API: feed one line at a time.
 * This is the primary entry point for interactive usage.
 */
export function readLine(
  graph: CGGraph,
  state: ReaderState,
  diagnostics: Diagnostics,
  rawLine: string,
  lineNo: number,
  options?: ReaderOptions
): void {
  const opt: Required<ReaderOptions> = {
    defaultClass: options?.defaultClass ?? "text",
    strict: options?.strict ?? true,
  };

  const t = trimOne(rawLine);

  // Ignore empty lines (we store them nowhere in v1.0; easy to add later)
  if (t.length === 0) return;

  // 1) Class directives
  const cd = parseClassDirective(rawLine);
  if (cd) {
    if (cd.kind === "Reset") state.resetClass(opt.defaultClass);
    else state.currentClass = cd.cls;

    // Validate class name (strict)
    const msg = validateClassNameOrLabelOrEmpty(state.currentClass);
    if (msg) diagnostics.error(lineNo, `Invalid class name '${state.currentClass}': ${msg}`);

    return;
  }

  // 2) Node header
  const nh = parseNodeHeader(rawLine);
  if (nh) {
    // Validate label (strict)
    const msg = validateClassNameOrLabelOrEmpty(nh.label);
    if (msg) diagnostics.error(lineNo, `Invalid node label '${nh.label}': ${msg}`);

    // Validate class as well (in case it was set earlier)
    const msg2 = validateClassNameOrLabelOrEmpty(state.currentClass);
    if (msg2) diagnostics.error(lineNo, `Invalid current class '${state.currentClass}': ${msg2}`);

    const node = graph.getOrCreateNode(state.currentClass, nh.label);
    state.currentNodeKey = node.key;
    return;
  }

  // 3) Close node
  if (isCloseNodeLine(rawLine)) {
    state.closeNode();
    return;
  }

  // All other lines require an open node
  if (state.currentNodeKey === "") {
    // Strict mode: property outside node is error (your requirement).
    // For non-property content, we warn (helps authoring).
    const prop = parseProperty(rawLine);
    if (prop && opt.strict) {
      diagnostics.error(lineNo, `Property line outside of any node: '${rawLine}'`);
    } else {
      diagnostics.warn(lineNo, `Content outside of any node ignored: '${rawLine}'`);
    }
    return;
  }

  const node = graph.getNodeByKey(state.currentNodeKey);
  if (!node) {
    // Should not happen if graph and state are consistent
    diagnostics.error(lineNo, `Internal error: current node key not found: '${state.currentNodeKey}'`);
    state.closeNode();
    return;
  }

  // 4) Incoming edge
  const inc = parseIncomingEdge(rawLine);
  if (inc) {
    // Validate referenced class/label
    const m1 = validateClassNameOrLabelOrEmpty(inc.cls);
    if (m1) diagnostics.error(lineNo, `Invalid incoming edge class '${inc.cls}': ${m1}`);
    const m2 = validateClassNameOrLabelOrEmpty(inc.label);
    if (m2) diagnostics.error(lineNo, `Invalid incoming edge label '${inc.label}': ${m2}`);

    const ok = node.addIncoming(inc.cls, inc.label);
    if (!ok) diagnostics.warn(lineNo, `Duplicate incoming edge ignored: <|${inc.cls}=${inc.label}`);
    return;
  }

  // 5) Property (overwrite)
  const prop = parseProperty(rawLine);
  if (prop) {
    node.setProperty(prop.key, prop.value);
    return;
  }

  // 6) Outgoing edge
  const out = parseOutgoingEdge(rawLine);
  if (out) {
    const m1 = validateClassNameOrLabelOrEmpty(out.cls);
    if (m1) diagnostics.error(lineNo, `Invalid outgoing edge class '${out.cls}': ${m1}`);
    const m2 = validateClassNameOrLabelOrEmpty(out.label);
    if (m2) diagnostics.error(lineNo, `Invalid outgoing edge label '${out.label}': ${m2}`);

    const ok = node.addOutgoing(out.cls, out.label);
    if (!ok) diagnostics.warn(lineNo, `Duplicate outgoing edge ignored: ${out.cls}:${out.label}`);
    return;
  }

  // 7) Plain text line (stored as Line{signal,text}, signal detected but not interpreted)
  node.addLine(rawLine);
}
