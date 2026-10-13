import { describe, it, expect } from "vitest";
import {
  calculateItemCostCents,
  calculateEstimateRange,
  calculateChangeOrderTotals,
  calculateBudgetImpact,
  formatCurrency,
} from "./index";

describe("Deterministic Financial Engine", () => {
  describe("calculateItemCostCents", () => {
    it("multiplies hours and hourly rate strictly in integer cents", () => {
      // 10.5 hours at $125.00/hr (12500 cents) -> 131250 cents ($1312.50)
      const cost = calculateItemCostCents(10.5, 12500);
      expect(cost).toBe(131250);
      expect(Number.isInteger(cost)).toBe(true);
    });

    it("prevents floating-point drift on fractional sums", () => {
      // 0.1 hours + 0.2 hours at $100.00/hr (10000 cents)
      const cost1 = calculateItemCostCents(0.1, 10000);
      const cost2 = calculateItemCostCents(0.2, 10000);
      expect(cost1 + cost2).toBe(3000); // exactly 3000 cents ($30.00)
    });

    it("throws on negative hours or rates", () => {
      expect(() => calculateItemCostCents(-1, 10000)).toThrow();
      expect(() => calculateItemCostCents(5, -500)).toThrow();
    });
  });

  describe("calculateEstimateRange", () => {
    it("returns consistent min and max costs", () => {
      const estimate = calculateEstimateRange(8, 12, 15000); // $150/hr
      expect(estimate.hoursMin).toBe(8);
      expect(estimate.hoursMax).toBe(12);
      expect(estimate.costMinCents).toBe(120000); // $1,200.00
      expect(estimate.costMaxCents).toBe(180000); // $1,800.00
    });

    it("ensures hoursMax is never lower than hoursMin", () => {
      const inverted = calculateEstimateRange(10, 5, 10000);
      expect(inverted.hoursMin).toBe(10);
      expect(inverted.hoursMax).toBe(10);
      expect(inverted.costMinCents).toBe(100000);
      expect(inverted.costMaxCents).toBe(100000);
    });
  });

  describe("calculateChangeOrderTotals", () => {
    it("aggregates multiple finding effort estimates deterministically", () => {
      const items = [
        { hoursMin: 5, hoursMax: 8 },
        { hoursMin: 12.5, hoursMax: 20 },
        { hoursMin: 0, hoursMax: 0 }, // in-scope item
      ];

      const totals = calculateChangeOrderTotals(items, 15000, "USD");
      expect(totals.totalHoursMin).toBe(17.5);
      expect(totals.totalHoursMax).toBe(28);
      expect(totals.totalCostMinCents).toBe(262500); // $2,625.00
      expect(totals.totalCostMaxCents).toBe(420000); // $4,200.00
      expect(totals.formattedCostRange).toBe("$2,625.00 – $4,200.00");
    });
  });

  describe("calculateBudgetImpact", () => {
    it("calculates new budget and percentage increases", () => {
      // Original: $10,000 (1,000,000 cents), Extra: $2,000 to $3,500
      const impact = calculateBudgetImpact(1000000, 200000, 350000);
      expect(impact.originalBudgetCents).toBe(1000000);
      expect(impact.newBudgetMinCents).toBe(1200000);
      expect(impact.newBudgetMaxCents).toBe(1350000);
      expect(impact.percentageIncreaseMin).toBe(20); // 20%
      expect(impact.percentageIncreaseMax).toBe(35); // 35%
    });
  });

  describe("formatCurrency", () => {
    it("formats USD cents properly", () => {
      expect(formatCurrency(15000, "USD")).toBe("$150.00");
      expect(formatCurrency(0, "USD")).toBe("$0.00");
      expect(formatCurrency(1000000, "USD")).toBe("$10,000.00");
    });

    it("formats EUR cents properly", () => {
      const formatted = formatCurrency(25000, "EUR");
      expect(formatted).toContain("250.00");
    });
  });
});
