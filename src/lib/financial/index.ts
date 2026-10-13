/**
 * Deterministic Financial Engine
 *
 * PRODUCT PRINCIPLE: Never let the LLM calculate final totals.
 * All financial amounts are stored and calculated strictly as integer cents
 * to eliminate floating-point drift.
 */

export interface EffortRange {
  hoursMin: number;
  hoursMax: number;
}

export interface FinancialEstimate {
  hoursMin: number;
  hoursMax: number;
  costMinCents: number;
  costMaxCents: number;
}

export interface ChangeOrderFinancials {
  totalHoursMin: number;
  totalHoursMax: number;
  totalCostMinCents: number;
  totalCostMaxCents: number;
  currency: string;
  formattedCostRange: string;
}

export interface BudgetImpact {
  originalBudgetCents: number;
  newBudgetMinCents: number;
  newBudgetMaxCents: number;
  percentageIncreaseMin: number;
  percentageIncreaseMax: number;
}

/**
 * Calculates item cost in integer cents given hours and an hourly rate in cents.
 */
export function calculateItemCostCents(
  hours: number,
  hourlyRateCents: number
): number {
  if (hours < 0 || hourlyRateCents < 0) {
    throw new Error("Hours and hourly rate must be non-negative");
  }
  return Math.round(hours * hourlyRateCents);
}

/**
 * Calculates financial cost range from effort range and hourly rate
 */
export function calculateEstimateRange(
  hoursMin: number,
  hoursMax: number,
  hourlyRateCents: number
): FinancialEstimate {
  const safeMin = Math.max(0, hoursMin);
  const safeMax = Math.max(safeMin, hoursMax);

  const costMinCents = calculateItemCostCents(safeMin, hourlyRateCents);
  const costMaxCents = calculateItemCostCents(safeMax, hourlyRateCents);

  return {
    hoursMin: safeMin,
    hoursMax: safeMax,
    costMinCents,
    costMaxCents,
  };
}

/**
 * Deterministically aggregates multiple scope findings into change order totals
 */
export function calculateChangeOrderTotals(
  items: EffortRange[],
  hourlyRateCents: number,
  currency = "USD"
): ChangeOrderFinancials {
  let totalHoursMin = 0;
  let totalHoursMax = 0;

  for (const item of items) {
    const safeMin = Math.max(0, item.hoursMin);
    const safeMax = Math.max(safeMin, item.hoursMax);
    totalHoursMin += safeMin;
    totalHoursMax += safeMax;
  }

  // Round hours to 2 decimal places to prevent FP accumulation
  totalHoursMin = Math.round(totalHoursMin * 100) / 100;
  totalHoursMax = Math.round(totalHoursMax * 100) / 100;

  const totalCostMinCents = calculateItemCostCents(totalHoursMin, hourlyRateCents);
  const totalCostMaxCents = calculateItemCostCents(totalHoursMax, hourlyRateCents);

  let formattedCostRange: string;
  if (totalCostMinCents === totalCostMaxCents) {
    formattedCostRange = formatCurrency(totalCostMinCents, currency);
  } else {
    formattedCostRange = `${formatCurrency(totalCostMinCents, currency)} – ${formatCurrency(totalCostMaxCents, currency)}`;
  }

  return {
    totalHoursMin,
    totalHoursMax,
    totalCostMinCents,
    totalCostMaxCents,
    currency,
    formattedCostRange,
  };
}

/**
 * Calculates budget impact metrics
 */
export function calculateBudgetImpact(
  originalBudgetCents: number,
  additionalCostMinCents: number,
  additionalCostMaxCents: number
): BudgetImpact {
  const newBudgetMinCents = originalBudgetCents + additionalCostMinCents;
  const newBudgetMaxCents = originalBudgetCents + additionalCostMaxCents;

  const percentageIncreaseMin =
    originalBudgetCents > 0
      ? Math.round((additionalCostMinCents / originalBudgetCents) * 1000) / 10
      : 0;

  const percentageIncreaseMax =
    originalBudgetCents > 0
      ? Math.round((additionalCostMaxCents / originalBudgetCents) * 1000) / 10
      : 0;

  return {
    originalBudgetCents,
    newBudgetMinCents,
    newBudgetMaxCents,
    percentageIncreaseMin,
    percentageIncreaseMax,
  };
}

/**
 * Formats integer cents into human-readable currency strings (e.g. 15000 -> "$150.00")
 */
export function formatCurrency(cents: number, currency = "USD"): string {
  const amount = cents / 100;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if unusual currency code
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}
