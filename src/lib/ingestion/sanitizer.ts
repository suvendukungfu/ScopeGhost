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

  if (value.startsWith("\t") || value.startsWith("\r")) {
    return `'${value}`;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }

  // If first character is a known formula trigger, prepend single quote (')
  if (FORMULA_TRIGGERS.some((trigger) => trimmed.startsWith(trigger))) {
    return `'${value}`;
  }

  return value;
}

/**
 * Normalizes text content:
 * - Replaces CRLF and CR with standard LF (\n)
 * - Strips zero-width characters and null bytes
 */
export function normalizeTextContent(content: string): string {
  if (!content) return "";

  return content
    // Remove null bytes
    .replace(/\0/g, "")
    // Normalize newlines
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove zero-width spaces, joiners, non-joiners
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}
