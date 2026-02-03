/**
 * Reader options.
 */

export interface ReaderOptions {
  /**
   * Default class name used when state.currentClass is empty and you want a fallback.
   * NOTE: Your latest spec says "close class clears currentClass".
   * We keep defaultClass so the host can choose a UX policy (optional).
   */
  defaultClass?: string; // default "text"

  /**
   * Strict conformance:
   * - property outside node => error
   * - invalid class/label => error
   */
  strict?: boolean; // default true

  /**
   * If true, outgoing edge creates the target node as a stub (recommended convenience).
   */
  createStubNodesForEdges?: boolean; // default true

  /**
   * Optional future: same-class shorthand ": TargetLabel"
   * Default false (kept out of frozen spec unless you explicitly enable it).
   */
  allowSameClassEdgeShorthand?: boolean; // default false
}

