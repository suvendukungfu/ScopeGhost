import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { ProjectRepository } from "@/lib/db/repositories/projects";
import { FindingsRepository } from "@/lib/db/repositories/findings";
import { calculateChangeOrderTotals, formatCurrency } from "@/lib/financial";
import { CreateChangeOrderSchema } from "@/lib/types/schemas";

const LEGAL_DISCLAIMER =
  "Notice: This Change Order is an advisory technical comparison and effort estimate prepared for collaborative client review. It is based on documented project communications and does not constitute formal legal counsel.";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }

    const parsed = CreateChangeOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const db = getDb();
    const projectRepo = new ProjectRepository(db);
    const findingsRepo = new FindingsRepository(db);

    const project = projectRepo.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const allFindings = findingsRepo.findFindingsByProjectId(projectId);
    const selectedFindings = allFindings.filter((f) =>
      parsed.data.selectedFindingIds.includes(f.id)
    );

    if (selectedFindings.length !== parsed.data.selectedFindingIds.length) {
      return NextResponse.json(
        { error: "One or more selected findings do not belong to this project" },
        { status: 400 }
      );
    }
    if (selectedFindings.some((finding) => finding.humanStatus !== "ACCEPTED")) {
      return NextResponse.json(
        { error: "Only findings explicitly accepted by a human reviewer can be included" },
        { status: 409 }
      );
    }

    // 1. Calculate totals deterministically (non-LLM)
    const effortItems = selectedFindings.map((f) => ({
      hoursMin: f.estHoursMin,
      hoursMax: f.estHoursMax,
    }));

    const financials = calculateChangeOrderTotals(
      effortItems,
      project.hourlyRateCents,
      project.currency
    );

    const existingOrders = findingsRepo.findChangeOrdersByProjectId(projectId);
    const orderNumber = existingOrders.length + 1;

    // 2. Build structured Markdown document
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let markdown = `# CHANGE ORDER #${orderNumber}: ${parsed.data.title.toUpperCase()}

**Project:** ${project.name}  
**Client:** ${project.clientName}  
**Date:** ${dateStr}  
**Billing Rate:** ${formatCurrency(project.hourlyRateCents, project.currency)}/hour  
**Status:** DRAFT (Pending Human Approval)  

---

## 1. Executive Summary

This change order outlines additional scope items identified from client communications that extend beyond the baseline Statement of Work (SOW). All items listed below have been cross-referenced against original agreement deliverables and explicit exclusions.

${parsed.data.customNotes ? `**Notes:** ${parsed.data.customNotes}\n` : ""}

## 2. Itemized Scope Adjustments

| # | Item / Request | Scope Classification | Cited Evidence Quote | Est. Hours | Est. Cost (${project.currency}) |
|---|---|---|---|---|---|
`;

    selectedFindings.forEach((finding, idx) => {
      const hoursRange =
        finding.estHoursMin === finding.estHoursMax
          ? `${finding.estHoursMin}h`
          : `${finding.estHoursMin}h – ${finding.estHoursMax}h`;

      const costMin = Math.round(finding.estHoursMin * project.hourlyRateCents);
      const costMax = Math.round(finding.estHoursMax * project.hourlyRateCents);
      const costStr =
        costMin === costMax
          ? formatCurrency(costMin, project.currency)
          : `${formatCurrency(costMin, project.currency)} – ${formatCurrency(costMax, project.currency)}`;

      const cleanQuote = finding.citedRequestQuote.replace(/\n/g, " ").slice(0, 80);

      markdown += `| ${idx + 1} | **${finding.title}** | \`${finding.classification}\` | *"${cleanQuote}"* | ${hoursRange} | ${costStr} |\n`;
    });

    markdown += `
---

## 3. Financial Summary

- **Total Estimated Effort:** ${financials.totalHoursMin} to ${financials.totalHoursMax} developer hours
- **Total Additional Cost:** **${financials.formattedCostRange}** (${project.currency})
- **Original Project Budget:** ${formatCurrency(project.originalBudgetCents, project.currency)}
- **Revised Estimated Budget:** ${formatCurrency(project.originalBudgetCents + financials.totalCostMinCents, project.currency)} – ${formatCurrency(project.originalBudgetCents + financials.totalCostMaxCents, project.currency)}

---

## 4. Acceptance & Sign-off

By signing below, the client authorizes the additional engineering scope and associated estimated costs. Work on these items will commence upon receipt of this signed change order.

**Client Signature:** ___________________________________  
**Date:** _______________  

---

*${LEGAL_DISCLAIMER}*
`;

    // 3. Persist Change Order record
    const changeOrder = findingsRepo.createChangeOrder({
      projectId,
      orderNumber,
      title: parsed.data.title,
      selectedFindingIds: parsed.data.selectedFindingIds,
      totalHoursMin: financials.totalHoursMin,
      totalHoursMax: financials.totalHoursMax,
      totalCostMinCents: financials.totalCostMinCents,
      totalCostMaxCents: financials.totalCostMaxCents,
      generatedMarkdown: markdown,
      humanDisclaimer: LEGAL_DISCLAIMER,
    });

    return NextResponse.json({ changeOrder }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
