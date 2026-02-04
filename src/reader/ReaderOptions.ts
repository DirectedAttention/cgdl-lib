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
   * If true, outgoing edge creates the target node as a stub (recommended convenience).
   */
  createStubNodesForEdges?: boolean; // default true
}

