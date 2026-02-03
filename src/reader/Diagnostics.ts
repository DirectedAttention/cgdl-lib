/**
 * Diagnostics with line numbers.
 * v1.0 strict mode:
 * - property outside a node => error
 * Other unrecognized content outside a node => warning (or could be error later).
 */

export interface DiagItem {
  lineNo: number;
  message: string;
}

export class Diagnostics {
  public readonly warnings: DiagItem[] = [];
  public readonly errors: DiagItem[] = [];

  public warn(lineNo: number, message: string): void {
    this.warnings.push({ lineNo, message });
  }

  public error(lineNo: number, message: string): void {
    this.errors.push({ lineNo, message });
  }

  public hasErrors(): boolean {
    return this.errors.length > 0;
  }
}
