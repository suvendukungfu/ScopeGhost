import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { FindingsRepository } from "@/lib/db/repositories/findings";
import { UpdateChangeOrderSchema } from "@/lib/types/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    const { id: projectId, orderId } = await params;
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    const parsed = UpdateChangeOrderSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const order = new FindingsRepository(getDb()).updateChangeOrder(
      projectId,
      orderId,
      parsed.data
    );
    if (!order) {
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    }
    return NextResponse.json({ changeOrder: order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
