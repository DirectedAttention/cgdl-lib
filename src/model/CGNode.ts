/**
 * Node data:
 * - properties overwrite (reassignment)
 * - edges de-dup (duplicate adds warn; stored once)
 * - lines preserved as Line{signal,text}
 */

import type { NodeKey } from "../types";
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

  public readonly _outgoingSet: Set<string> = new Set();  // stores TARGET node keys (to)
  public readonly _incomingSet: Set<string> = new Set();  // stores SOURCE node keys (from)

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
  public addOutgoing(targetClass: string, targetLabel: string): boolean {
    const k = this.edgeKey(targetClass, targetLabel);

    if (this._outgoingSet.has(k)) 
      return false;

    this._outgoingSet.add(k);

    return true;
  }

  /**
   * Returns true if inserted; false if duplicate.
   */
  public addIncoming(sourceClass: string, sourceLabel: string): boolean 
  {
    const k = this.edgeKey(sourceClass, sourceLabel);

    if (this._incomingSet.has(k)) 
      return false;

    this._incomingSet.add(k);

    return true;
  }

  public addLine(line: Line): void 
  {
    this.lines.push(line);
  }

  /**
   * Removes a specific outgoing edge.
   * Returns true if the edge existed and was removed.
   */
  public removeOutgoing(targetClass: string, targetLabel: string): boolean {
    const k = this.edgeKey(targetClass, targetLabel);

    if (!this._outgoingSet.has(k)) 
      return false;

    this._outgoingSet.delete(k);

    return true;
  }

  /**
   * Removes a specific incoming edge.
   * Returns true if the edge existed and was removed.
   */
  public removeIncoming(sourceClass: string, sourceLabel: string): boolean {
    const k = this.edgeKey(sourceClass, sourceLabel);
    if (!this._incomingSet.has(k)) 
      return false;

    this._incomingSet.delete(k);
    return true;
  }  

  private edgeKey(cls: string, label: string): string {
    return `${normalizeKeyPart(cls)}::${normalizeKeyPart(label)}`;
  }
}

