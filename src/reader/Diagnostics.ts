// src/reader/Diagnostics.ts
//
// Minimal diagnostics collector for cgdl-lib.
// We keep a short "code" so callers can filter / count specific issues,
// while also providing a human-readable message.

export type DiagLevel = "warn" | "error";

export interface DiagItem {
  level: DiagLevel;
  lineNo: number;
  message: string;
}

export class Diagnostics {
  public readonly warnings: DiagItem[] = [];
  public readonly errors: DiagItem[] = [];

  public warn(lineNo: number, message: string): void 
  {
    const item: DiagItem = { level: "warn", lineNo, message };
    this.warnings.push(item);
  }

  public error(lineNo: number, message: string): void {
    const item: DiagItem = { level: "error", lineNo, message };
    this.errors.push(item);
  }

  // Optional: convenience overloads for legacy call sites (2-arg style)
  public warnMsg(lineNo: number, message: string): void {
    this.warn(lineNo, message);
  }

  public errorMsg(lineNo: number, message: string): void {
    this.error(lineNo, message);
  }

  public hasErrors(): boolean {
    return this.errors.length > 0;
  }
}

