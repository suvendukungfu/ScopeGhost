import crypto from "node:crypto";
import { ParsedItem } from "./parsers";

export interface EvidenceChunkData {
  chunkIndex: number;
  stableId: string;
  textContent: string;
  author?: string | null;
  timestampStr?: string | null;
  sourceHash: string;
  metadata: Record<string, string>;
}

/**
 * Calculates a SHA-256 hash of raw content for deterministic source tracking
 */
export function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Chunker that turns parsed items into stable, referenced evidence chunks
 * @param items Array of parsed items from a source document
 * @param sourceHash SHA-256 hash of the parent source document
 * @param sourcePrefix Short identifier for source (e.g. "SRC-01" or "DOC-A")
 * @param maxWordsPerChunk Maximum words allowed before splitting an item into sub-chunks (default 400)
 */
export function chunkParsedItems(
  items: ParsedItem[],
  sourceHash: string,
  sourcePrefix = "SRC-01",
  maxWordsPerChunk = 400
): EvidenceChunkData[] {
  const chunks: EvidenceChunkData[] = [];
  let chunkIndex = 0;

  for (const item of items) {
    const words = item.rawText.split(/\s+/).filter(Boolean);

    if (words.length <= maxWordsPerChunk) {
      // Single chunk for this item
      const stableId = `${sourcePrefix}#C${String(chunkIndex + 1).padStart(2, "0")}`;
      chunks.push({
        chunkIndex,
        stableId,
        textContent: item.rawText,
        author: item.author ?? null,
        timestampStr: item.timestampStr ?? null,
        sourceHash,
        metadata: item.metadata ?? {},
      });
      chunkIndex++;
    } else {
      // Split large item into sub-chunks at sentence or paragraph boundaries
      let currentWordStart = 0;
      let subIndex = 1;

      while (currentWordStart < words.length) {
        const slice = words.slice(currentWordStart, currentWordStart + maxWordsPerChunk);
        const subText = slice.join(" ");
        const stableId = `${sourcePrefix}#C${String(chunkIndex + 1).padStart(2, "0")}-P${subIndex}`;

        chunks.push({
          chunkIndex,
          stableId,
          textContent: subText,
          author: item.author ?? null,
          timestampStr: item.timestampStr ?? null,
          sourceHash,
          metadata: item.metadata ?? {},
        });

        chunkIndex++;
        subIndex++;
        currentWordStart += maxWordsPerChunk;
      }
    }
  }

  return chunks;
}
