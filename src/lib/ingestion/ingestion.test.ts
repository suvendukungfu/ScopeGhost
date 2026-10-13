import { describe, it, expect } from "vitest";
import {
  sanitizeCsvCell,
  normalizeTextContent,
  parseCsvRows,
  parseCsvContent,
  parseMarkdownContent,
  parsePlainTextContent,
  processEvidenceDocument,
  detectFileType,
} from "./index";

describe("Evidence Ingestion & Sanitization Engine", () => {
  describe("CSV Formula Injection Protection", () => {
    it("escapes dangerous formula triggers (=, +, -, @, \\t, \\r)", () => {
      expect(sanitizeCsvCell("=1+1")).toBe("'=1+1");
      expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
      expect(sanitizeCsvCell("+HYPERLINK('http://evil.com')")).toBe("'+HYPERLINK('http://evil.com')");
      expect(sanitizeCsvCell("-5+10")).toBe("'-5+10");
      expect(sanitizeCsvCell("@SUM(A1:B1)")).toBe("'@SUM(A1:B1)");
      expect(sanitizeCsvCell("\tmalicious")).toBe("'\tmalicious");
    });

    it("leaves safe regular text untouched", () => {
      expect(sanitizeCsvCell("Hello world")).toBe("Hello world");
      expect(sanitizeCsvCell("Feature request: add export button")).toBe(
        "Feature request: add export button"
      );
      expect(sanitizeCsvCell("12345")).toBe("12345");
      expect(sanitizeCsvCell("")).toBe("");
    });
  });

  describe("Text Normalizer", () => {
    it("strips null bytes and normalizes CRLF/CR to LF", () => {
      const raw = "Line 1\r\nLine 2\rLine 3\0";
      const normalized = normalizeTextContent(raw);
      expect(normalized).toBe("Line 1\nLine 2\nLine 3");
    });

    it("strips zero-width unicode characters", () => {
      const invisible = "hello\u200Bworld\uFEFF";
      expect(normalizeTextContent(invisible)).toBe("helloworld");
    });
  });

  describe("RFC 4180 CSV Parser", () => {
    it("handles quoted cells containing commas and newlines", () => {
      const csv = `Author,Date,Message\n"Jane Doe",2026-03-01,"Hey, can we also add\na dark mode theme?"\n"Bob Smith",2026-03-02,"Just a minor tweak"`;
      const rows = parseCsvRows(csv);

      expect(rows).toHaveLength(3);
      expect(rows[1][0]).toBe("Jane Doe");
      expect(rows[1][2]).toBe("Hey, can we also add\na dark mode theme?");
    });

    it("handles escaped quotes inside quotes", () => {
      const csv = `Key,Request\nREQ-101,"Client said: ""make it pop"" and increase logo"`;
      const rows = parseCsvRows(csv);

      expect(rows[1][1]).toBe('Client said: "make it pop" and increase logo');
    });

    it("auto-detects semicolon-delimited CSVs", () => {
      const csv = `From;Date;Message\nAlice;2026-03-04;Please integrate PayPal`;
      const items = parseCsvContent(csv);

      expect(items).toHaveLength(1);
      expect(items[0].author).toBe("Alice");
      expect(items[0].rawText).toBe("Please integrate PayPal");
    });

    it("sanitizes malicious formula cells directly in parsed CSV", () => {
      const maliciousCsv = `Reporter,Ticket,Summary\nEve,T-1,"=HYPERLINK('http://phishing.site')"`;
      const items = parseCsvContent(csvFormula(maliciousCsv));

      function csvFormula(str: string) {
        return str;
      }

      expect(items[0].rawText).toContain("'=HYPERLINK");
    });
  });

  describe("Markdown Parser", () => {
    it("extracts sections and email-like headers", () => {
      const md = `# Client Feedback Session\n\nFrom: Sarah Connor\nDate: Oct 12, 2026\nSubject: Mobile Support\n\nWe really need this to work seamlessly on iPad and Android tablets.\n\n---\n\nFrom: Sarah Connor\nDate: Oct 13, 2026\nSubject: Animations\n\nPlease add 3D scroll animations to all card components.`;

      const items = parseMarkdownContent(md);
      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items[0].author).toBe("Sarah Connor");
      expect(items[0].metadata?.subject).toBe("Mobile Support");
      expect(items[0].rawText).toContain("work seamlessly on iPad and Android tablets");
    });
  });

  describe("Plain Text Parser", () => {
    it("splits messages by double newlines", () => {
      const txt = `Can you change the navbar color to purple?\n\nAlso, we need a complete user authentication overhaul with SSO.`;
      const items = parsePlainTextContent(txt);

      expect(items).toHaveLength(2);
      expect(items[0].rawText).toBe("Can you change the navbar color to purple?");
      expect(items[1].rawText).toBe(
        "Also, we need a complete user authentication overhaul with SSO."
      );
    });
  });

  describe("Unified Document Ingestion & Chunking", () => {
    it("generates deterministic chunk IDs and SHA-256 hashes", () => {
      const content = `From: Client A\nDate: 2026-10-01\nWe want support for crypto wallets.\n\nFrom: Client A\nDate: 2026-10-02\nAlso add export to Excel.`;
      const result = processEvidenceDocument(content, "emails.txt", "TXT", "SRC-EMAIL");

      expect(result.sourceHash).toHaveLength(64); // SHA-256 hex length
      expect(result.chunks).toHaveLength(2);
      expect(result.chunks[0].stableId).toBe("SRC-EMAIL#C01");
      expect(result.chunks[1].stableId).toBe("SRC-EMAIL#C02");
      expect(result.chunks[0].textContent).toContain("crypto wallets");
      expect(result.chunks[1].textContent).toContain("export to Excel");
    });

    it("auto-detects file types by extension", () => {
      expect(detectFileType("requests.csv")).toBe("CSV");
      expect(detectFileType("notes.md")).toBe("MARKDOWN");
      expect(detectFileType("chat.txt")).toBe("TXT");
      expect(detectFileType("unknown_file")).toBe("TXT");
    });
  });
});
