/**
 * cgdl-lib — core types
 * Product 1: cgdl-lib (TypeScript, ESM-only, npm)
 */


/**
 * Raw class name as it appears in [[class]] lines.
 * Can contain spaces, punctuation, etc. — no normalization applied here.
 */
export type ClassName = string;

/**
 * Raw node label as written after ## or in edge targets.
 * Full Unicode, spaces, colons allowed — preserved for display.
 */
export type NodeLabel = string;

/**
 * NodeKey = norm(className) + "::" + norm(label)
 * Both parts are lowercased and whitespace-collapsed.
 */
export type NodeKey = string;

/**
 * Lightweight reference to another node (used in edges).
 * Uses raw (non-normalized) values for readability and serialization.
 */
export interface EdgeRef {
  cls: ClassName;
  label: NodeLabel;
}
