import { test, expect } from "@playwright/test";

test.describe("ScopeGhost Full QA & Business Workflow Suite", () => {
  test("audits all pages, navigation, Tiger telemetry, settings, and full project lifecycle with zero console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    // -------------------------------------------------------------
    // 1. Homepage & Initial Experience
    // -------------------------------------------------------------
    await page.goto("/");
    await expect(page).toHaveTitle(/ScopeGhost/);
    await expect(page.getByRole("heading", { name: "Project portfolio" })).toBeVisible();

    // Verify footer disclaimer
    await expect(page.getByText(/Inference processed strictly locally via Ollama/i)).toBeVisible();

    // -------------------------------------------------------------
    // 2. Tiger Cloud Telemetry Dashboard (/tiger-demo)
    // -------------------------------------------------------------
    await page.getByRole("link", { name: /Tiger Telemetry/i }).click();
    await expect(page).toHaveURL(/.*\/tiger-demo/);
    await expect(page.getByRole("heading", { name: "Tiger Cloud Agent Telemetry" })).toBeVisible();
    await expect(page.getByText(/Managed PostgreSQL \/ TimescaleDB telemetry/i)).toBeVisible();

    // Verify telemetry data cards and refresh button
    await expect(page.getByText(/Total Agent Actions/i)).toBeVisible();
    const refreshBtn = page.getByRole("button", { name: /Refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(page.getByText(/Recent Telemetry Activity/i)).toBeVisible();

    // -------------------------------------------------------------
    // 3. Settings & Health Panel (/settings)
    // -------------------------------------------------------------
    await page.getByRole("link", { name: /Settings/i }).click();
    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.getByRole("heading", { name: "Privacy and local processing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Local model status" })).toBeVisible();
    await expect(page.getByText(/Selected model:/i)).toBeVisible();

    // Verify JSON export button is present
    await expect(page.getByRole("link", { name: /Download local data export/i })).toBeVisible();

    // -------------------------------------------------------------
    // 4. Return to Dashboard & Seed Synthetic Demo
    // -------------------------------------------------------------
    await page.getByRole("link", { name: /ScopeGhost/i }).first().click();
    await expect(page).toHaveURL("http://127.0.0.1:3000/");

    const loadDemoBtn = page.getByRole("button", { name: /Load Synthetic Demo/i }).first();
    await expect(loadDemoBtn).toBeVisible();
    await loadDemoBtn.click();

    // Verify seeded project card
    const projectCard = page.getByRole("article").filter({ hasText: /E-Commerce Web Portal v2/i });
    await expect(projectCard).toBeVisible({ timeout: 10000 });
    await expect(projectCard).toContainText("AeroTech Apparel");
    await expect(projectCard).toContainText("$150.00/hr");

    // -------------------------------------------------------------
    // 5. Open Project Workspace & Inspect Tabs
    // -------------------------------------------------------------
    await projectCard.getByRole("link", { name: /E-Commerce Web Portal v2/i }).click();
    await expect(page).toHaveURL(/.*\/projects\/demo-aerotech-portal/);
    await expect(page.locator("h1")).toContainText("E-Commerce Web Portal v2");

    // Tab 1: Baseline Agreement
    await expect(page.getByRole("heading", { name: "Baseline Agreement Clauses" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Responsive Web Storefront" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Native Mobile Applications Excluded" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cryptocurrency Gateways Excluded" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Two Included Revision Rounds" })).toBeVisible();

    // Tab 2: Evidence Library
    await page.getByRole("button", { name: /2\. Evidence library/i }).click();
    await expect(page.getByRole("heading", { name: "Evidence library" })).toBeVisible();
    await expect(page.getByText("SRC-AERO#C01")).toBeVisible();
    await expect(page.getByText("SRC-AERO#C02")).toBeVisible();
    await expect(page.getByText("SRC-AERO#C06")).toBeVisible();

    // Tab 3: Scope Audit & Review
    await page.getByRole("button", { name: /3\. Request analysis/i }).click();
    await expect(page.getByRole("heading", { name: "Scope Differential Audit" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Run Local Scope Audit/i })).toBeVisible();

    // Tab 4: Change Orders Workspace
    await page.getByRole("button", { name: /4\. Change Orders/i }).click();
    await expect(page.getByRole("heading", { name: "Change Orders & Client Proposals" })).toBeVisible();
    const draftOrderBtn = page.getByRole("button", { name: /Draft New Change Order/i });
    await expect(draftOrderBtn).toBeVisible();

    // Open modal
    await draftOrderBtn.click();
    await expect(page.getByRole("heading", { name: "Draft Change Order Proposal" })).toBeVisible();
    await expect(page.getByText(/Deterministic Total Additional Cost/i)).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    // -------------------------------------------------------------
    // 6. Test Responsive Layouts
    // -------------------------------------------------------------
    // Tablet width
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator("h1")).toContainText("E-Commerce Web Portal v2");

    // Mobile width
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("h1")).toContainText("E-Commerce Web Portal v2");

    // Reset to Desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // Assert zero uncaught JavaScript errors in browser console
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("favicon.ico") && !err.includes("ECONNREFUSED")
    );
    expect(criticalErrors).toEqual([]);
  });
});
