/**
 * Citation Verification Engine
 *
 * PRODUCT PRINCIPLE: Evidence before conclusions.
 * Programmatically verifies that quoted excerpts returned by the LLM
 * actually exist in the source document chunks or baseline clauses.
 */

export interface CitationVerificationResult {
  isVerified: boolean;
  matchType: "EXACT" | "NORMALIZED" | "SUBSTRING" | "NOT_FOUND";
  matchConfidence: number; // 0.0 to 1.0
  highlightIndex?: number;
}

/**
 * Normalizes text for lenient quote matching:
 * - Converts to lower case
 * - Converts smart quotes (“ ” ‘ ’) to standard ascii (' ")
 * - Replaces non-alphanumeric punctuation with spaces
 * - Collapses repeated whitespace
 */
export function normalizeForComparison(str: string): string {
  if (!str) return "";

  return str
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifies if a cited quote exists inside a source chunk's text
 */
export function verifyCitation(
  citedQuote: string,
  sourceText: string
): CitationVerificationResult {
  if (!citedQuote || !sourceText) {
    return {
      isVerified: false,
      matchType: "NOT_FOUND",
      matchConfidence: 0,
    };
  }

  const cleanQuote = citedQuote.trim();
  const cleanSource = sourceText.trim();

  // 1. Exact match
  const exactIdx = cleanSource.indexOf(cleanQuote);
  if (exactIdx !== -1) {
    return {
      isVerified: true,
      matchType: "EXACT",
      matchConfidence: 1.0,
      highlightIndex: exactIdx,
    };
  }

  // 2. Case-insensitive match
  const caseInsensitiveIdx = cleanSource.toLowerCase().indexOf(cleanQuote.toLowerCase());
  if (caseInsensitiveIdx !== -1) {
    return {
      isVerified: true,
      matchType: "EXACT",
      matchConfidence: 0.98,
      highlightIndex: caseInsensitiveIdx,
    };
  }

  // 3. Normalized comparison (punctuation and whitespace insensitive)
  const normQuote = normalizeForComparison(cleanQuote);
  const normSource = normalizeForComparison(cleanSource);

  if (normQuote.length >= 8 && normSource.includes(normQuote)) {
    return {
      isVerified: true,
      matchType: "NORMALIZED",
      matchConfidence: 0.95,
    };
  }

  // 4. Token overlap search (for quotes where LLM truncated a word at start/end)
  const quoteTokens = normQuote.split(" ").filter((t) => t.length > 2);
  if (quoteTokens.length >= 4) {
    const matchedTokens = quoteTokens.filter((token) => normSource.includes(token));
    const tokenMatchRatio = matchedTokens.length / quoteTokens.length;

    if (tokenMatchRatio >= 0.85) {
      return {
        isVerified: true,
        matchType: "SUBSTRING",
        matchConfidence: Math.round(tokenMatchRatio * 90) / 100,
      };
    }
  }

  return {
    isVerified: false,
    matchType: "NOT_FOUND",
    matchConfidence: 0,
  };
}
