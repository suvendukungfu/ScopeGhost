import { FileType } from "@/lib/types";
import { normalizeTextContent } from "./sanitizer";
import {
  parseCsvContent,
  parseMarkdownContent,
  parsePlainTextContent,
  ParsedItem,
} from "./parsers";
import { chunkParsedItems, computeContentHash, EvidenceChunkData } from "./chunker";

export interface IngestionResult {
  sourceHash: string;
  fileType: FileType;
  items: ParsedItem[];
  chunks: EvidenceChunkData[];
}

/**
 * Detects file type from filename extension if not explicitly provided
 */
export function detectFileType(filename: string, fallback: FileType = "TXT"): FileType {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "CSV";
  if (ext === "md" || ext === "markdown") return "MARKDOWN";
  if (ext === "txt") return "TXT";
  return fallback;
}

/**
 * Ingests, normalizes, parses, and chunks a client evidence document
 */
export function processEvidenceDocument(
  rawContent: string,
  filename: string,
  explicitType?: FileType,
  sourcePrefix = "SRC-01"
): IngestionResult {
  const fileType = explicitType || detectFileType(filename);
  const normalized = normalizeTextContent(rawContent);
  const sourceHash = computeContentHash(normalized);

  let items: ParsedItem[] = [];
  switch (fileType) {
    case "CSV":
      items = parseCsvContent(normalized);
      break;
    case "MARKDOWN":
      items = parseMarkdownContent(normalized);
      break;
    case "TXT":
    default:
      items = parsePlainTextContent(normalized);
      break;
  }

  // If no items were parsed (e.g. single unformatted line), wrap the normalized text
  if (items.length === 0 && normalized.trim().length > 0) {
    items = [{ rawText: normalized.trim(), itemRef: "DOC-1" }];
  }

  const chunks = chunkParsedItems(items, sourceHash, sourcePrefix);

  return {
    sourceHash,
    fileType,
    items,
    chunks,
  };
}

export * from "./sanitizer";
export * from "./parsers";
export * from "./chunker";
