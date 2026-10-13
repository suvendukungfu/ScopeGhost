import { ModelScopeAnalysisOutputSchema } from "@/lib/types/schemas";
import { z } from "zod";

export type ParsedScopeAnalysis = z.infer<typeof ModelScopeAnalysisOutputSchema>;

/**
 * Extracts and parses JSON from raw LLM output, handling markdown code fences
 * or preamble/postamble banter.
 */
export function extractAndValidateLlmOutput(rawResponse: string): ParsedScopeAnalysis {
  if (!rawResponse || typeof rawResponse !== "string") {
    throw new Error("Empty model response received");
  }

  let cleaned = rawResponse.trim();

  // 1. Try stripping markdown code fences if present (```json ... ``` or ``` ...)
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // 2. Locate outermost JSON object boundaries { ... }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 3. Parse JSON
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to parse model response as JSON: ${msg}. Raw response excerpt: ${rawResponse.slice(0, 150)}...`
    );
  }

  // 4. Validate against Zod schema
  const validationResult = ModelScopeAnalysisOutputSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Model response failed schema validation: ${errorDetails}`);
  }

  return validationResult.data;
}
