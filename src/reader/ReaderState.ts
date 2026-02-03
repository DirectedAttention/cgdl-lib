/**
 * ReaderState: no nulls.
 * - currentClass: "" means "no class block open"
 * - currentNodeKey: "" means "no current node"
 */

export class ReaderState {
  public currentClass: string;
  public currentNodeKey: string;

  public constructor() {
    this.currentClass = "";
    this.currentNodeKey = "";
  }

  public clearNode(): void {
    this.currentNodeKey = "";
  }

  public clearClass(): void {
    this.currentClass = "";
    this.currentNodeKey = "";
  }
}

