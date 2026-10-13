import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { FindingsRepository } from "@/lib/db/repositories/findings";
import { UpdateFindingDecisionSchema } from "@/lib/types/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = UpdateFindingDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const db = getDb();
    const repo = new FindingsRepository(db);

    const updated = repo.updateFindingDecision(id, {
      humanStatus: parsed.data.humanStatus,
      humanNotes: parsed.data.humanNotes,
      classification: parsed.data.classification,
      estHoursMin: parsed.data.estHoursMin,
      estHoursMax: parsed.data.estHoursMax,
    });

    if (!updated) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }

    return NextResponse.json({ finding: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
