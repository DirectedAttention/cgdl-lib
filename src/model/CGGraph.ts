// src/model/CGGraph.ts

/**
 * Graph storage:
 * - nodes: Map<NodeKey, CGNode>
 *
 * Identity is (ClassName, Label) => NodeKey = norm(class)::norm(label)
 * NOTE: CGDL node sets are unordered by design, so we do NOT maintain insertion order.
 */

import type { NodeKey } from "../types.js";
import { normalizeDisplay, normalizeKeyPart } from "../utils/normalize.js";
import { CGNode } from "./CGNode.js";

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

  /**
   * Deletes a node and cleans all connected edges.
   * Returns true if the node existed and was removed.
   */
  public deleteNode(className: string, label: string): boolean
  {
    const key = this.makeNodeKey(className, label);
    const node = this.nodes.get(key);
    if (!node) 
      return false;

    // Clean incoming edges (sources pointing TO this node)
    for (const sourceKey of Array.from(node._incomingSet))
    {
      const source = this.nodes.get(sourceKey);
      if (source)
      {
        source.removeOutgoing(className, label);
      }
    }

    // Clean outgoing edges (targets this node points TO)
    for (const targetKey of Array.from(node._outgoingSet))
    {
      const target = this.nodes.get(targetKey);
      if (target)
      {
        target.removeIncoming(className, label);
      }
    }

    // Optional: drop references from the node object itself
    node._incomingSet.clear();
    node._outgoingSet.clear();

    this.nodes.delete(key);
    
    return true;
  }

  /**
   * Adds a specific outgoing edge from source to target.
   * Returns true if the edge did not exist and was added.
   */

  public addEdge(
    sourceClass: string, sourceLabel: string,
    targetClass: string, targetLabel: string
  ): boolean
  {
    const source = this.getOrCreateNode(sourceClass, sourceLabel);
    const target = this.getOrCreateNode(targetClass, targetLabel);

    const inserted = source.addOutgoing(targetClass, targetLabel);
    if (!inserted) 
      return false;

    target.addIncoming(sourceClass, sourceLabel);
    return true;
  }


  /**
   * Deletes a specific outgoing edge from source to target.
   * Returns true if the edge existed and was removed.
   */
  public deleteEdge(
    sourceClass: string, sourceLabel: string,
    targetClass: string, targetLabel: string
  ): boolean {
    const source = this.nodes.get(this.makeNodeKey(sourceClass, sourceLabel));
    
    if (!source || !source.removeOutgoing(targetClass, targetLabel)) 
      return false;

    const target = this.nodes.get(this.makeNodeKey(targetClass, targetLabel));
    if (target) 
    {
      target.removeIncoming(sourceClass, sourceLabel);
    }

    return true;
  }

  /**
   * Parses a NodeKey "cls::label" into its normalized parts.
   * Both parts are already normalized, because NodeKey is canonical.
   */
  public parseNodeKey(key: NodeKey): { cls: string; label: string } {
    const i = key.indexOf("::");
    if (i < 0) return { cls: "", label: key as string };
    return { cls: key.slice(0, i), label: key.slice(i + 2) };
  }

  /**
   * Deterministic CGDL-like dump:
   * - Nodes sorted by canonical key (stable for testing/debug).
   * - Emits [[ Class ]] blocks and ## Label lines.
   * - Properties emitted as: {} KEY = value  (KEY uppercased)
   * - Edges emitted as: TargetClass:TargetLabel
   *
   * Notes:
   * - Uses display names stored on nodes (classNameDisplay/labelDisplay) so output matches
   *   the canonical “first-seen” casing/spaces you want to keep.
   * - Edge targets are dumped using canonical node display if the target exists;
   *   otherwise falls back to parsed key parts.
   */
  public toLinesCgdl(): string[] {
    const out: string[] = [];

    const nodeKeys = Array.from(this.nodes.keys()).sort();

    let currentClassDisplay: string | null = null;

    for (const key of nodeKeys) {
      const node = this.nodes.get(key)!;

      const clsDisp = node.classNameDisplay;
      const labelDisp = node.labelDisplay;

      // Emit class header when class changes (including graph-level class "")
      if (currentClassDisplay === null || currentClassDisplay !== clsDisp) {
        currentClassDisplay = clsDisp;
        out.push(`[[ ${clsDisp} ]]`.trim()); // if clsDisp == "" -> "[[]]" after trim
      }

      // Emit node header
      out.push(`## ${labelDisp}`.trim()); // if labelDisp == "" -> "##" after trim

      // Properties: stable, key uppercased in output
      const props = Array.from(node.properties.entries()).sort(([a], [b]) => a.localeCompare(b));
      for (const [k, v] of props) {
        out.push(`{} ${k.toUpperCase()} = ${v}`);
      }

      // Outgoing edges: stable by target key, but display using target node's canonical display if present
      const outs = Array.from(node._outgoingSet.values()).sort();
      for (const targetKey of outs) {
        const target = this.nodes.get(targetKey);
        if (target) {
          out.push(`${target.classNameDisplay}:${target.labelDisplay}`);
        } else {
          // Fallback: derive from key if node missing (should be rare in your design)
          const parsed = this.parseNodeKey(targetKey);
          out.push(`${parsed.cls}:${parsed.label}`);
        }
      }

      // Preserved lines (optional): keep in stored order, reconstruct as close as possible
      for (const l of node.lines) {
        if (l.signal) out.push(`${l.signal} ${l.text}`.trimEnd());
        else out.push(`${l.text}`.trimEnd());
      }
    }

    return out;
  }
}
