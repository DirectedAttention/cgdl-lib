/**
 * ReaderState is the minimal mutable state for line-by-line interactive reading.
 * No nulls: empty string means "no node open".
 */

export class ReaderState {
  public currentClass: string;
  public currentNodeKey: string;

  public constructor(defaultClass: string) {
    this.currentClass = defaultClass;
    this.currentNodeKey = "";
  }

  public resetClass(defaultClass: string): void {
    this.currentClass = defaultClass;
  }

  public closeNode(): void {
    this.currentNodeKey = "";
  }
}

