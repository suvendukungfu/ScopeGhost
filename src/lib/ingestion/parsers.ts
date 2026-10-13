import { normalizeTextContent, sanitizeCsvCell } from "./sanitizer";

export interface ParsedItem {
  rawText: string;
  author?: string;
  timestampStr?: string;
  itemRef?: string;
  metadata?: Record<string, string>;
}

/**
 * Robust CSV Line Tokenizer supporting RFC 4180:
 * - handles quotes with commas and newlines inside quotes
 * - handles escaped quotes ("")
 */
export function parseCsvRows(csvContent: string): string[][] {
  const normalized = normalizeTextContent(csvContent);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  // Auto-detect delimiter from the first line (comma or semicolon or tab)
  const firstLine = normalized.split("\n")[0] || "";
  let delimiter = ",";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ";";
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = "\t";
  }

  let i = 0;
  while (i < normalized.length) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < normalized.length && normalized[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(sanitizeCsvCell(currentField));
        currentField = "";
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(sanitizeCsvCell(currentField));
        currentField = "";
        if (currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push last field if present
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(sanitizeCsvCell(currentField));
    if (currentRow.some((f) => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses CSV export records into structured ParsedItems
 */
export function parseCsvContent(csvContent: string): ParsedItem[] {
  const rows = parseCsvRows(csvContent);
  if (rows.length === 0) return [];

  // Normalize header names
  const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/['"]/g, ""));
  const dataRows = rows.slice(1);

  // Identify column indices
  const authorIdx = headers.findIndex((h) =>
    ["author", "sender", "from", "user", "reporter", "created by", "assignee"].includes(h)
  );
  const dateIdx = headers.findIndex((h) =>
    ["date", "timestamp", "created", "created at", "time", "date created"].includes(h)
  );
  const textIdx = headers.findIndex((h) =>
    ["message", "body", "description", "content", "request", "summary", "notes"].includes(h)
  );
  const refIdx = headers.findIndex((h) =>
    ["id", "key", "issue", "ticket", "ref", "ticket id", "ticket #"].includes(h)
  );

  return dataRows.map((row, index) => {
    let mainText = "";
    if (textIdx !== -1 && row[textIdx]) {
      mainText = row[textIdx];
    } else {
      // Fallback: join non-empty columns with headers
      mainText = row
        .map((val, idx) => (val && headers[idx] ? `${headers[idx]}: ${val}` : val))
        .filter(Boolean)
        .join(" | ");
    }

    const metadata: Record<string, string> = {};
    headers.forEach((hdr, idx) => {
      if (row[idx]) {
        metadata[hdr] = row[idx];
      }
    });

    return {
      rawText: mainText,
      author: authorIdx !== -1 && row[authorIdx] ? row[authorIdx] : undefined,
      timestampStr: dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : undefined,
      itemRef: refIdx !== -1 && row[refIdx] ? row[refIdx] : `ROW-${index + 1}`,
      metadata,
    };
  });
}

/**
 * Parses Markdown documents, splitting by headings, email thread blocks, or horizontal rules
 */
export function parseMarkdownContent(mdContent: string): ParsedItem[] {
  const normalized = normalizeTextContent(mdContent);
  if (!normalized.trim()) return [];

  const rawSections = normalized.split(/\n(?=(?:#{1,4}\s+|---+|\*\*\*+|From:\s+))/g);
  const items: ParsedItem[] = [];
  let currentDocHeading = "";

  for (let idx = 0; idx < rawSections.length; idx++) {
    const trimmed = rawSections[idx].trim();
    if (!trimmed) continue;

    // Discard standalone divider lines (---, ***, ===)
    if (/^(?:---+|\*\*\*+|===+)$/.test(trimmed)) {
      continue;
    }

    // Check if section is ONLY a standalone heading with no body
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1 && /^#{1,4}\s+(.+)$/.test(lines[0])) {
      currentDocHeading = lines[0].replace(/^#{1,4}\s+/, "");
      continue;
    }

    // Extract metadata from email-like headers if present
    const fromMatch = trimmed.match(/^From:\s*(.+)$/im);
    const dateMatch = trimmed.match(/^Date:\s*(.+)$/im);
    const subjectMatch = trimmed.match(/^Subject:\s*(.+)$/im);
    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/m);

    const metadata: Record<string, string> = {};
    if (currentDocHeading) metadata.documentHeading = currentDocHeading;
    if (subjectMatch) metadata.subject = subjectMatch[1].trim();
    if (headingMatch) metadata.heading = headingMatch[1].trim();

    items.push({
      rawText: trimmed,
      author: fromMatch ? fromMatch[1].trim() : undefined,
      timestampStr: dateMatch ? dateMatch[1].trim() : undefined,
      itemRef: headingMatch ? headingMatch[1].trim() : `SEC-${items.length + 1}`,
      metadata,
    });
  }

  return items;
}

/**
 * Parses plain text files, splitting by double newlines or common email delimiters
 */
export function parsePlainTextContent(textContent: string): ParsedItem[] {
  const normalized = normalizeTextContent(textContent);
  if (!normalized.trim()) return [];

  const paragraphs = normalized.split(/\n\s*\n/g);
  const items: ParsedItem[] = [];

  for (let idx = 0; idx < paragraphs.length; idx++) {
    const trimmed = paragraphs[idx].trim();
    if (!trimmed) continue;

    const fromMatch = trimmed.match(/^From:\s*(.+)$/im);
    const dateMatch = trimmed.match(/^Date:\s*(.+)$/im);

    items.push({
      rawText: trimmed,
      author: fromMatch ? fromMatch[1].trim() : undefined,
      timestampStr: dateMatch ? dateMatch[1].trim() : undefined,
      itemRef: `MSG-${idx + 1}`,
    });
  }

  return items;
}
