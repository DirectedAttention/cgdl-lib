/**
 * Node data:
 * - properties overwrite (reassignment)
 * - edges de-dup (duplicate adds warn; stored once)
 * - lines preserved as Line{signal,text}
 */

import type { EdgeRef, NodeKey } from "../types";
import { normalizeDisplay, normalizeKeyPart } from "../utils/normalize";
import { Line } from "./Line";

export class CGNode 
{
  public readonly key: NodeKey;

  // Display (preserve case, whitespace collapsed)
  public classNameDisplay: string;
  public labelDisplay: string;

  // Properties: overwrite semantics.
  public readonly properties: Map<string, string> = new Map();

  // Edges: de-duplicated, but stored in arrays for stable iteration/serialization.
  public readonly outgoing: EdgeRef[] = [];
  public readonly incoming: EdgeRef[] = [];

  private readonly _outgoingSet: Set<string> = new Set();
  private readonly _incomingSet: Set<string> = new Set();

  // Non-structural lines inside the node.
  public readonly lines: Line[] = [];

  public constructor(args: { key: NodeKey; classNameDisplay: string; labelDisplay: string }) {
    this.key = args.key;
    this.classNameDisplay = args.classNameDisplay;
    this.labelDisplay = args.labelDisplay;
  }

  public refreshDisplay(className: string, label: string): void {
    this.classNameDisplay = normalizeDisplay(className);
    this.labelDisplay = normalizeDisplay(label);
  }

  public setProperty(key: string, value: string): void {
    this.properties.set(key, value);
  }

  /**
   * Returns true if inserted; false if duplicate.
   */
  public addOutgoing(cls: string, label: string): boolean {
    const k = edgeKey(cls, label);
    if (this._outgoingSet.has(k)) return false;
    this._outgoingSet.add(k);
    this.outgoing.push({ cls, label });
    return true;
  }

  /**
   * Returns true if inserted; false if duplicate.
   */
  public addIncoming(cls: string, label: string): boolean {
    const k = edgeKey(cls, label);
    if (this._incomingSet.has(k)) return false;
    this._incomingSet.add(k);
    this.incoming.push({ cls, label });
    return true;
  }

  public addLine(line: Line): void 
  {
    this.lines.push(line);
  }
}

function edgeKey(cls: string, label: string): string {
  return `${normalizeKeyPart(cls)}::${normalizeKeyPart(label)}`;
}
