// src/reader/Reader.ts
//
// Refactor: split readLine into focused helpers.
// - No file I/O; incremental line-by-line graph building only.
// - Edges are always consistent: adding an edge updates BOTH
//   source.outgoing and target.incoming, and target nodes are
//   created as stubs if they do not exist yet.

import { CGGraph } from "../model/CGGraph.js";
import { Line } from "../model/Line.js";
import { splitLines, trimOne } from "../utils/strings.js";
import { Diagnostics } from "./Diagnostics.js";
import { ReaderState } from "./ReaderState.js";
import {
  parseClassOpenOrClose,
  parseNodeHeader,
  parseOutgoingEdge,
  parsePropertyText,
} from "./Parsers.js";

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

function getEffectiveNode(graph: CGGraph, state: ReaderState)
{
  if (state.currentNodeKey !== "")
  {
    const node = graph.getNodeByKey(state.currentNodeKey);
    if (node) return node;
  }

  // When no explicit node is selected, use the class default node: (currentClass,"")
  return graph.getOrCreateNode(state.currentClass, "");
}

export function readText(text: string): ReadResult
{
  const graph = new CGGraph();
  const state = new ReaderState();
  const diagnostics = new Diagnostics();

  const lines = splitLines(text);
  for (let i = 0; i < lines.length; i++)
  {
    readLine(graph, state, diagnostics, lines[i]!, i + 1);
  }

  return { graph, state, diagnostics };
}

export function readLine(
  graph: CGGraph,
  state: ReaderState,
  diagnostics: Diagnostics,
  rawLine: string,
  lineNo: number
): LineResult
{
  // Parse once. This is CRITICAL for {} properties and for preserving signals.
  const lineRecord = Line.parse(rawLine);

  if (isBlankLine(rawLine))
  {
    return { recognized: "blank", lineRecord };
  }

  const classRes = tryHandleClassControl(state, rawLine, lineRecord);
  if (classRes)
    return classRes;

  const nodeRes = tryHandleNodeControl(graph, state, diagnostics, rawLine, lineNo, lineRecord);
  if (nodeRes)
    return nodeRes;

  const propRes = tryHandleProperty(graph, state, diagnostics, lineNo, lineRecord);
  if (propRes)
    return propRes;

  const edgeRes = tryHandleOutgoingEdge(graph, state, diagnostics, rawLine, lineNo, lineRecord);
  if (edgeRes)
    return edgeRes;

  return handleStoredOrIgnoredLine(graph, state, diagnostics, rawLine, lineNo, lineRecord);
}

// ------------------------- helpers -------------------------

function isBlankLine(rawLine: string): boolean
{
  return trimOne(rawLine).length === 0;
}

function tryHandleClassControl(state: ReaderState, rawLine: string, lineRecord: Line): LineResult | null
{
  const cc = parseClassOpenOrClose(rawLine);
  if (!cc) return null;

  if (cc.kind === "ClassClose")
  {
    state.clearClass();
    return { recognized: "class_close", lineRecord };
  }

  state.currentClass = cc.className;
  state.clearNode(); // opening class clears current node selection
  return { recognized: "class_open", lineRecord };
}

function tryHandleNodeControl(
  graph: CGGraph,
  state: ReaderState,
  diagnostics: Diagnostics,
  rawLine: string,
  lineNo: number,
  lineRecord: Line
): LineResult | null
{
  const nh = parseNodeHeader(rawLine);
  if (!nh) return null;

  if (nh.kind === "NodeClose")
  {
    if (state.currentNodeKey !== "")
    {
      state.clearNode();
      return { recognized: "node_close", lineRecord };
    }

    diagnostics.warn(lineNo, "## closes node but no node is open");
    return { recognized: "node_close", lineRecord };
  }

  // NodeOpen
  const node = graph.getOrCreateNode(state.currentClass, nh.label);
  state.currentNodeKey = node.key;
  return { recognized: "node_open", lineRecord };
}

function tryHandleProperty(
  graph: CGGraph,
  state: ReaderState,
  diagnostics: Diagnostics,
  lineNo: number,
  lineRecord: Line
): LineResult | null
{
  if (lineRecord.signal !== "{}") return null;

  const p = parsePropertyText(lineRecord.text);
  if (!p)
  {
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
  lineRecord: Line
): LineResult | null
{
  const out = parseOutgoingEdge(rawLine);
  if (!out) return null;

  const from = getEffectiveNode(graph, state);

  // Always ensure target exists (no dangling edges; targets may be stubs)
  const target = graph.getOrCreateNode(out.cls, out.label);

  // Add on source side (dedup)
  const inserted = from.addOutgoing(out.cls, out.label);
  if (!inserted)
  {
    diagnostics.warn(lineNo, `Duplicate outgoing edge ignored: ${out.cls}:${out.label}`);
    return { recognized: "edge_out", lineRecord };
  }

  // Add reciprocal incoming on target
  const fromParts = graph.parseNodeKey(from.key);
  target.addIncoming(fromParts.cls, fromParts.label);

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
  const currentNode = getCurrentNode(graph, state);
  if (currentNode)
  {
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
