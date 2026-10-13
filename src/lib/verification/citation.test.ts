import { describe, it, expect } from "vitest";
import { verifyCitation } from "./citation";

describe("Citation Verification Engine", () => {
  const sourceText = `Hi Team,\nCould we also please add an export to CSV feature on the customer table?\nBest,\nAlice`;

  it("verifies exact substring matches with 1.0 confidence", () => {
    const quote = "add an export to CSV feature on the customer table";
    const result = verifyCitation(quote, sourceText);

    expect(result.isVerified).toBe(true);
    expect(result.matchType).toBe("EXACT");
    expect(result.matchConfidence).toBe(1.0);
  });

  it("verifies case-insensitive matches", () => {
    const quote = "ADD AN EXPORT TO CSV FEATURE";
    const result = verifyCitation(quote, sourceText);

    expect(result.isVerified).toBe(true);
    expect(result.matchConfidence).toBeGreaterThanOrEqual(0.95);
  });

  it("verifies quotes with smart quotes or minor punctuation differences", () => {
    const complexSource = `The contract says: "Client agrees to 2 revision rounds only."`;
    const modelQuote = `“Client agrees to 2 revision rounds only.”`;

    const result = verifyCitation(modelQuote, complexSource);
    expect(result.isVerified).toBe(true);
    expect(result.matchType).toBe("NORMALIZED");
  });

  it("detects and rejects hallucinated quotes", () => {
    const hallucinated = "Client explicitly agreed to pay an extra $5,000 for this feature.";
    const result = verifyCitation(hallucinated, sourceText);

    expect(result.isVerified).toBe(false);
    expect(result.matchType).toBe("NOT_FOUND");
    expect(result.matchConfidence).toBe(0);
  });

  it("handles empty quotes or empty source texts safely", () => {
    expect(verifyCitation("", sourceText).isVerified).toBe(false);
    expect(verifyCitation("something", "").isVerified).toBe(false);
  });
});
