import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { BaselineClauseRepository } from "@/lib/db/repositories/clauses";
import { CreateBaselineClauseSchema } from "@/lib/types/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const repo = new BaselineClauseRepository(db);
    const clauses = repo.findByProjectId(id);
    return NextResponse.json({ clauses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = CreateBaselineClauseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const db = getDb();
    const repo = new BaselineClauseRepository(db);
    const clause = repo.create({
      projectId: id,
      clauseType: parsed.data.clauseType,
      title: parsed.data.title,
      content: parsed.data.content,
      sectionRef: parsed.data.sectionRef,
    });

    return NextResponse.json({ clause }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clauseId = searchParams.get("clauseId");

    if (!clauseId) {
      return NextResponse.json(
        { error: "clauseId query parameter required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const repo = new BaselineClauseRepository(db);
    repo.delete(clauseId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
