// src/model/CGGraph.ts

/**
 * Graph storage:
 * - nodes: Map<NodeKey, CGNode>
 *
 * Identity is (ClassName, Label) => NodeKey = norm(class)::norm(label)
 * NOTE: CGDL node sets are unordered by design, so we do NOT maintain insertion order.
 */

import type { NodeKey } from "../types";
import { normalizeDisplay, normalizeKeyPart } from "../utils/normalize";
import { CGNode } from "./CGNode";

/**
 * In-memory container for a CGDL graph.
 * Stores nodes by canonical NodeKey.
 * Nodes are created/merged on demand via getOrCreateNode.
 * Unordered by design — no insertion order preserved.
 */
export class CGGraph {
  public readonly nodes: Map<NodeKey, CGNode> = new Map();

  public makeNodeKey(className: string, label: string): NodeKey {
    return `${normalizeKeyPart(className)}::${normalizeKeyPart(label)}`;
  }

  public getNodeByKey(key: NodeKey): CGNode | undefined {
    return this.nodes.get(key);
  }

  public getOrCreateNode(className: string, label: string): CGNode 
  {
    const key = this.makeNodeKey(className, label);

    const existing = this.nodes.get(key);
    if (existing) {
      existing.refreshDisplay(normalizeDisplay(className), normalizeDisplay(label));
      return existing;
    }

    const node = new CGNode({
      key,
      classNameDisplay: normalizeDisplay(className),
      labelDisplay: normalizeDisplay(label),
    });

    this.nodes.set(key, node);
    return node;
  }
}
