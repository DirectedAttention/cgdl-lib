/**
 * cgdl-lib — core types
 * Product 1: cgdl-lib (TypeScript, ESM-only, npm)
 */

export type ClassName = string;
export type NodeLabel = string;

/**
 * NodeKey = norm(className) + "::" + norm(label)
 * Both parts are lowercased and whitespace-collapsed.
 */
export type NodeKey = string;

export interface EdgeRef {
  cls: ClassName;
  label: NodeLabel;
}
