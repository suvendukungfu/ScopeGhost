import { FileType } from "@/lib/types";
import { normalizeTextContent } from "./sanitizer";
import {
  parseCsvContent,
  parseMarkdownContent,
  parsePlainTextContent,
  ParsedItem,
} from "./parsers";
import { chunkParsedItems, computeContentHash, EvidenceChunkData } from "./chunker";
import { FileTypeSchema } from "@/lib/types/schemas";

export class UnsupportedEvidenceFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedEvidenceFormatError";
  }
}

export interface IngestionResult {
  sourceHash: string;
  fileType: FileType;
  items: ParsedItem[];
  chunks: EvidenceChunkData[];
  normalizationWarnings: string[];
}

/**
 * Detects file type from filename extension if not explicitly provided
 */
export function detectFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "CSV";
  if (ext === "md" || ext === "markdown") return "MARKDOWN";
  if (ext === "txt") return "TXT";
  throw new UnsupportedEvidenceFormatError(
    `Unsupported evidence format for "${filename}". Supported formats are .txt, .md, .markdown, and .csv.`
  );
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
  const detectedType = detectFileType(filename);
  const parsedExplicitType = explicitType
    ? FileTypeSchema.safeParse(explicitType)
    : undefined;
  if (parsedExplicitType && !parsedExplicitType.success) {
    throw new UnsupportedEvidenceFormatError(
      "Unsupported evidence format. Supported formats are TXT, MARKDOWN, and CSV."
    );
  }
  const fileType = parsedExplicitType?.success ? parsedExplicitType.data : detectedType;
  if (typeof rawContent !== "string" || rawContent.trim().length === 0) {
    throw new Error("Evidence file is empty. Add text before importing.");
  }

  const normalized = normalizeTextContent(rawContent);
  if (normalized.trim().length === 0) {
    throw new Error("Evidence file contains no readable text after normalization.");
  }
  const sourceHash = computeContentHash(rawContent);

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
    normalizationWarnings:
      normalized === rawContent
        ? []
        : ["Imported text was normalized; the original text is retained unchanged."],
  };
}

export * from "./sanitizer";
export * from "./parsers";
export * from "./chunker";
