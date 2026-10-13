import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { ProjectRepository } from "@/lib/db/repositories/projects";
import { CreateProjectSchema } from "@/lib/types/schemas";

export async function GET() {
  try {
    const db = getDb();
    const repo = new ProjectRepository(db);
    const projects = repo.findAll();
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const db = getDb();
    const repo = new ProjectRepository(db);
    const project = repo.create(parsed.data);

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
