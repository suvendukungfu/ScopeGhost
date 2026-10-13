import { test, expect } from "@playwright/test";

test.describe("ScopeGhost End-to-End Application Flow", () => {
  test("loads home page, seeds demo project, inspects contract & evidence, and views change order workspace", async ({
    page,
  }) => {
    // 1. Visit homepage
    await page.goto("/");
    await expect(page).toHaveTitle(/ScopeGhost/);
    await expect(page.getByText("ScopeGhost").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Active Projects" })).toBeVisible();

    // 2. Load synthetic demonstration project
    const loadDemoBtn = page.getByRole("button", { name: /Load Synthetic Demo/i }).first();
    await expect(loadDemoBtn).toBeVisible();
    await loadDemoBtn.click();

    // 3. Verify demo project card appears
    const demoCard = page.getByRole("link", { name: /E-Commerce Web Portal v2/i });
    await expect(demoCard).toBeVisible({ timeout: 10000 });
    await expect(demoCard).toContainText("AeroTech Apparel");

    // 4. Click to open project detail view
    await demoCard.click();
    await expect(page).toHaveURL(/.*\/projects\/demo-aerotech-portal/);
    await expect(page.locator("h1")).toContainText("E-Commerce Web Portal v2");

    // 5. Inspect Tab 1: Baseline Agreement Clauses
    await expect(
      page.getByRole("heading", { name: "Baseline Agreement Clauses" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Responsive Web Storefront" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Native Mobile Applications Excluded" })
    ).toBeVisible();

    // 6. Inspect Tab 2: Client Evidence
    const evidenceTab = page.getByRole("button", { name: /2. Client Evidence/i });
    await evidenceTab.click();
    await expect(
      page.getByRole("heading", { name: "Client Evidence Ingestion" })
    ).toBeVisible();
    await expect(page.getByText("SRC-AERO#C01")).toBeVisible();

    // 7. Inspect Tab 3: Scope Audit & Review
    const auditTab = page.getByRole("button", { name: /3. Scope Audit/i });
    await auditTab.click();
    await expect(
      page.getByRole("heading", { name: "Scope Differential Audit" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Run Local Scope Audit/i })
    ).toBeVisible();

    // 8. Inspect Tab 4: Change Orders Workspace
    const changeOrdersTab = page.getByRole("button", { name: /4. Change Orders/i });
    await changeOrdersTab.click();
    await expect(
      page.getByRole("heading", { name: "Change Orders & Client Proposals" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Draft New Change Order/i })
    ).toBeVisible();
  });
});
