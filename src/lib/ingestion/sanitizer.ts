/**
 * CSV and text sanitization module to prevent Formula Injection (CSV Injection)
 * and strip dangerous non-printable control characters.
 */

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escapes a cell value so that spreadsheet applications (Excel, LibreOffice, Sheets)
 * do not interpret it as an executable formula or command.
 */
export function sanitizeCsvCell(value: string): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  const normalized = value.replace(/^\uFEFF/, "");
  if (normalized.length === 0) {
    return "";
  }

  const trimmedLeading = normalized.replace(/^[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D]+/, "");
  const firstMeaningfulChar = trimmedLeading.trimStart();
  if (firstMeaningfulChar.length === 0) {
    return "";
  }

  if (
    normalized.startsWith("\t") ||
    normalized.startsWith("\r") ||
    normalized.startsWith("\n") ||
    FORMULA_TRIGGERS.some((trigger) => firstMeaningfulChar.startsWith(trigger))
  ) {
    return `'${value}`;
  }

  return value;
}

/**
 * Normalizes text content:
 * - Replaces CRLF and CR with standard LF (\n)
 * - Strips zero-width characters and non-printable control bytes that can hide commands or trigger parser edge cases
 */
export function normalizeTextContent(content: string): string {
  if (!content) return "";

  return content
    // Remove BOM and zero-width markers
    .replace(/^\uFEFF/, "")
    // Strip embedded control characters that can hide malicious payloads or break parsing
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // Remove null bytes
    .replace(/\0/g, "")
    // Normalize newlines
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove zero-width spaces, joiners, non-joiners
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}
