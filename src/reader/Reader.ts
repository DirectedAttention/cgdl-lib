/**
 * cgdl-lib Reader
 * - Single-line incremental parser that builds the graph
 * - Executes ONLY graph-building subset
 * - Preserves non-structural lines as Line{signal,text} inside the current node
 */

import { CGGraph } from "../model/CGGraph";
import { Line } from "../model/Line";
import { validateClassOrLabel } from "../utils/validate";
import { splitLines, trimOne } from "../utils/strings";
import { Diagnostics } from "./Diagnostics";
import type { ReaderOptions } from "./ReaderOptions";
import { ReaderState } from "./ReaderState";
import {
  parseClassOpenOrClose,
  parseNodeHeader,
  isCloseNodeLine,
  parseOutgoingEdge,
  parseSameClassEdgeShorthand,
  parseProperty,
} from "./Parsers";

export type Recognized =
  | "none"
  | "blank"
  | "class_open"
  | "class_close"
  | "node_select"
  | "node_close"
  | "edge_out"
  | "property_set"
  | "stored_line";

export interface LineResult {
  recognized: Recognized;
  lineRecord: Line;
}

export interface ReadResult {
  graph: CGGraph;
  state: ReaderState;
  diagnostics: Diagnostics;
}

export function createDefaultOptions(): Required<ReaderOptions> {
  return {
    defaultClass: "text",
    strict: true,
    createStubNodesForEdges: true,
    allowSameClassEdgeShorthand: false,
  };
}

export function readText(text: string, options?: ReaderOptions): ReadResult {
  const opt = { ...createDefaultOptions(), ...options };

  const graph = new CGGraph();
  const state = new ReaderState();
  const diagnostics = new Diagnostics();

  const lines = splitLines(text);
  for (let i = 0; i < lines.length; i++) {
    readLine(graph, state, diagnostics, lines[i]!, i + 1, opt);
  }

  return { graph, state, diagnostics };
}

export function readLine(
  graph: CGGraph,
  state: ReaderState,
  diagnostics: Diagnostics,
  rawLine: string,
  lineNo: number,
  options?: ReaderOptions
): LineResult {
  const opt = { ...createDefaultOptions(), ...options };
  const lineRecord = new Line(rawLine);

  // Blank lines: no-op
  if (trimOne(rawLine).length === 0) {
    return { recognized: "blank", lineRecord };
  }

  // A) Class control: [[ Class ]] or close
  const cc = parseClassOpenOrClose(rawLine);
  if (cc) {
    if (cc.kind === "ClassClose") {
      state.clearClass();
      return { recognized: "class_close", lineRecord };
    }

    if (opt.strict) {
      const msg = validateClassOrLabel(cc.className);
      if (msg) diagnostics.error(lineNo, `Invalid ClassName '${cc.className}': ${msg}`);
    }

    state.currentClass = cc.className;
    state.clearNode(); // opening class clears currentNode
    return { recognized: "class_open", lineRecord };
  }

  // B) Node header: ## Label
  const nh = parseNodeHeader(rawLine);
  if (nh) {
    const effectiveClass = state.currentClass;

    if (opt.strict) {
      if (effectiveClass.length === 0) {
        diagnostics.error(lineNo, `Cannot select node '## ${nh.label}' because currentClass is empty.`);
        return { recognized: "node_select", lineRecord };
      }

      const msgC = validateClassOrLabel(effectiveClass);
      if (msgC) diagnostics.error(lineNo, `Invalid currentClass '${effectiveClass}': ${msgC}`);

      const msgL = validateClassOrLabel(nh.label);
      if (msgL) diagnostics.error(lineNo, `Invalid Label '${nh.label}': ${msgL}`);
    }

    const node = graph.getOrCreateNode(effectiveClass, nh.label);
    state.currentNodeKey = node.key;
    return { recognized: "node_select", lineRecord };
  }

  // Close current node only: []
  if (isCloseNodeLine(rawLine)) {
    state.clearNode();
    return { recognized: "node_close", lineRecord };
  }

  // From here on: operations may need current node
  const currentNodeKey = state.currentNodeKey;
  const currentNode = currentNodeKey ? graph.getNodeByKey(currentNodeKey) : undefined;

  // Property assignment
  const prop = parseProperty(rawLine);
  if (prop) {
    if (!currentNode) {
      if (opt.strict) diagnostics.error(lineNo, `Property line outside of any node: '${rawLine}'`);
      return { recognized: "property_set", lineRecord };
    }
    currentNode.setProperty(prop.key, prop.value);
    return { recognized: "property_set", lineRecord };
  }

  // Outgoing edge: OtherClass:TargetLabel
  const out = parseOutgoingEdge(rawLine);
  if (out) {
    if (!currentNode) {
      diagnostics.warn(lineNo, `Outgoing edge ignored because no current node is open: '${rawLine}'`);
      return { recognized: "edge_out", lineRecord };
    }

    if (opt.strict) {
      const m1 = validateClassOrLabel(out.cls);
      if (m1) diagnostics.error(lineNo, `Invalid edge class '${out.cls}': ${m1}`);

      const m2 = validateClassOrLabel(out.label);
      if (m2) diagnostics.error(lineNo, `Invalid edge label '${out.label}': ${m2}`);
    }

    const inserted = currentNode.addOutgoing(out.cls, out.label);
    if (!inserted) diagnostics.warn(lineNo, `Duplicate outgoing edge ignored: ${out.cls}:${out.label}`);

    if (opt.createStubNodesForEdges) {
      graph.getOrCreateNode(out.cls, out.label);
    }

    return { recognized: "edge_out", lineRecord };
  }

  // Optional same-class shorthand: : TargetLabel
  if (opt.allowSameClassEdgeShorthand) {
    const sc = parseSameClassEdgeShorthand(rawLine);
    if (sc) {
      if (!currentNode) {
        diagnostics.warn(lineNo, `Same-class edge ignored because no current node is open: '${rawLine}'`);
        return { recognized: "edge_out", lineRecord };
      }

      const cls = state.currentClass;
      if (opt.strict && cls.length === 0) {
        diagnostics.error(lineNo, `Same-class edge cannot be resolved because currentClass is empty.`);
      }

      const inserted = currentNode.addOutgoing(cls, sc.label);
      if (!inserted) diagnostics.warn(lineNo, `Duplicate outgoing edge ignored: ${cls}:${sc.label}`);

      if (opt.createStubNodesForEdges && cls.length > 0) {
        graph.getOrCreateNode(cls, sc.label);
      }

      return { recognized: "edge_out", lineRecord };
    }
  }

  // Everything else: store if inside a node, otherwise return "none"
  if (currentNode) {
    currentNode.addLine(rawLine);
    return { recognized: "stored_line", lineRecord };
  }

  diagnostics.warn(lineNo, `Unrecognized content outside any node ignored: '${rawLine}'`);
  return { recognized: "none", lineRecord };
}

