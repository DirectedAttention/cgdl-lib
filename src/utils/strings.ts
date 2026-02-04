/**
 * Browser-safe string utilities (no Node.js dependencies).
 */

export function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

export function trimOne(s: string): string {
  return s.trim();
}

export function isAlnum(ch: string): boolean {
  if (ch.length !== 1) 
    return false;

  const c = ch.charCodeAt(0);
  const is0_9 = c >= 48 && c <= 57;
  const isA_Z = c >= 65 && c <= 90;
  const isa_z = c >= 97 && c <= 122;

  return is0_9 || isA_Z || isa_z;
}

