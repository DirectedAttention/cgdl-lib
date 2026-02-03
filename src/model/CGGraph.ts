/**
 * Graph storage:
 * - nodes: Map<NodeKey, CGNode>
 * - order: NodeKey[] (stable insertion order)
 *
 * Identity is (ClassName, Label) => NodeKey = norm(class)::norm(label)
 */

import type { NodeKey } from "../types";
import { normalizeDisplay, normalizeKeyPart } from "../utils/normalize";
import { CGNode } from "./CGNode";

export class CGGraph {
  public readonly nodes: Map<NodeKey, CGNode> = new Map();
  public readonly order: NodeKey[] = [];

  public makeNodeKey(className: string, label: string): NodeKey {
    return `${normalizeKeyPart(className)}::${normalizeKeyPart(label)}`;
  }

  public getNodeByKey(key: NodeKey): CGNode | undefined {
    return this.nodes.get(key);
  }

  public getOrCreateNode(className: string, label: string): CGNode {
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
    this.order.push(key);
    return node;
  }
}
