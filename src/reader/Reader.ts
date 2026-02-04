// src/reader/Reader.ts
//
// Refactor: split readLine into focused helpers.
// - Keeps EXACT behavior you currently have (including “property outside node” = ignored warning).
// - All helpers are pure-ish and easy to unit test.
// - No file I/O; incremental line-by-line graph building only.

import { CGGraph } from "../model/CGGraph";
import { Line } from "../model/Line";
import { splitLines, trimOne } from "../utils/strings";
import { Diagnostics } from "./Diagnostics";
import type { ReaderOptions } from "./ReaderOptions";
import { ReaderState } from "./ReaderState";
import {
  parseClassOpenOrClose,
  parseNodeHeader,
  parseOutgoingEdge,
  parseSameClassEdgeShorthand,
  parsePropertyText,
} from "./Parsers";

export type Recognized =
  | "none"
  | "blank"
  | "class_open"
  | "class_close"
  | "node_open"
  | "node_close"
  | "edge_out"
  | "property"
  | "stored_line";

export interface LineResult 
{
  recognized: Recognized;
  lineRecord: Line;
}

export interface ReadResult 
{
  graph: CGGraph;
  state: ReaderState;
  diagnostics: Diagnostics;
}


function getEffectiveNode(graph: CGGraph, state: ReaderState) {
  if (state.currentNodeKey !== "") {
    const node = graph.getNodeByKey(state.currentNodeKey);
    if (node) return node;
  }
  return graph.getOrCreateNode(state.currentClass, "");
}



export function createDefaultOptions(): Required<ReaderOptions> 
{
  return {
    defaultClass: "",
    createStubNodesForEdges: true,
  };
}

export function readText(text: string, options?: ReaderOptions): ReadResult 
{
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
): LineResult 
{
  const opt = { ...createDefaultOptions(), ...options };

  // Parse once. This is CRITICAL for {} properties and for preserving signals.
  const lineRecord = Line.parse(rawLine);

  if (isBlankLine(rawLine)) 
  {
    return { recognized: "blank", lineRecord };
  }

  const classRes = tryHandleClassControl(state, rawLine, lineRecord);
  if (classRes) 
    return classRes;

  const nodeRes = tryHandleNodeControl(graph, state, diagnostics, rawLine, lineNo, lineRecord, opt);
  if (nodeRes) 
    return nodeRes;

  const propRes = tryHandleProperty(graph, state, diagnostics, lineNo, lineRecord);
  if (propRes) 
    return propRes;

  const edge = tryHandleOutgoingEdge(graph, state, diagnostics, rawLine, lineNo, lineRecord, opt.createStubNodesForEdges);
  if (edge) 
    return edge;

  return handleStoredOrIgnoredLine(graph, state, diagnostics, rawLine, lineNo, lineRecord);
}

// ------------------------- helpers -------------------------

function isBlankLine(rawLine: string): boolean 
{
  return trimOne(rawLine).length === 0;
}

function tryHandleClassControl(state: ReaderState, rawLine: string, lineRecord: Line): LineResult | null 
{
  // A) Class control: [[ Class ]] or close
  const cc = parseClassOpenOrClose(rawLine);
  if (!cc) return null;

  if (cc.kind === "ClassClose") {
    state.clearClass();
    return { recognized: "class_close", lineRecord };
  }

  state.currentClass = cc.className;
  state.clearNode(); // opening class clears currentNode
  return { recognized: "class_open", lineRecord };
}

function tryHandleNodeControl(
  graph: CGGraph,
  state: ReaderState,
  diagnostics: Diagnostics,
  rawLine: string,
  lineNo: number,
  lineRecord: Line,
  opt: Required<ReaderOptions>
): LineResult | null 
{
  // B) Node header: ## Label  OR  ## (close current node)
  const nh = parseNodeHeader(rawLine);
  if (!nh) return null;

  if (nh.kind === "NodeClose") {
    if (state.currentNodeKey !== "") {
      state.clearNode();
      return { recognized: "node_close", lineRecord };
    }

    diagnostics.warn(lineNo, "## closes node but no node is open");
    return { recognized: "node_close", lineRecord };
  }

  // NodeOpen
  const effectiveClass = state.currentClass;
  const node = graph.getOrCreateNode(effectiveClass, nh.label);
  state.currentNodeKey = node.key;
  return { recognized: "node_open", lineRecord };
}


function tryHandleProperty(
  graph: CGGraph,
  state: ReaderState,
  diagnostics: Diagnostics,
  lineNo: number,
  lineRecord: Line
): LineResult | null {
  if (lineRecord.signal !== "{}") return null;

  const p = parsePropertyText(lineRecord.text);
  if (!p) {
    diagnostics.warn(lineNo, "{} line must be in form: key = value");
    return { recognized: "none", lineRecord };
  }

  const node = getEffectiveNode(graph, state);
  node.setProperty(p.key, p.value);
  return { recognized: "property", lineRecord };
}


function tryHandleOutgoingEdge(
  graph: CGGraph,
  state: ReaderState,
  diagnostics: Diagnostics,
  rawLine: string,
  lineNo: number,
  lineRecord: Line,
  createStubNodesForEdges: boolean
): LineResult | null 
{
  const out = parseOutgoingEdge(rawLine);
  if (!out) return null;

  const from = getEffectiveNode(graph, state);

  const inserted = from.addOutgoing(out.cls, out.label);
  if (!inserted) {
    diagnostics.warn(lineNo, `Duplicate outgoing edge ignored: ${out.cls}:${out.label}`);
  }

  if (createStubNodesForEdges) {
    graph.getOrCreateNode(out.cls, out.label);
  }

  return { recognized: "edge_out", lineRecord };
}

function handleStoredOrIgnoredLine(
  graph: CGGraph,
  state: ReaderState,
  diagnostics: Diagnostics,
  rawLine: string,
  lineNo: number,
  lineRecord: Line
): LineResult 
{
  // Everything else: store if inside a node, otherwise return "none"
  const currentNode = getCurrentNode(graph, state);
  if (currentNode) {
    // Preserve the structured (signal,text), not the raw string
    currentNode.addLine(lineRecord);
    return { recognized: "stored_line", lineRecord };
  }

  diagnostics.warn(lineNo, `Unrecognized content outside any node ignored: '${rawLine}'`);
  return { recognized: "none", lineRecord };
}

function getCurrentNode(graph: CGGraph, state: ReaderState) 
{
  const k = state.currentNodeKey;
  if (!k) return undefined;
  return graph.getNodeByKey(k);
}


