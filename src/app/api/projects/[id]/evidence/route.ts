import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { EvidenceRepository } from "@/lib/db/repositories/evidence";
import { processEvidenceDocument } from "@/lib/ingestion";
import { FileType } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const repo = new EvidenceRepository(db);

    const sources = repo.findSourcesByProjectId(id);
    const chunks = repo.findChunksByProjectId(id);

    return NextResponse.json({ sources, chunks });
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
    const { id: projectId } = await params;
    const contentType = req.headers.get("content-type") || "";

    let filename = "evidence.txt";
    let rawContent = "";
    let fileType: FileType | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (file && typeof file === "object" && "text" in file) {
        filename = (file as File).name || filename;
        rawContent = await (file as File).text();
      } else {
        const textParam = formData.get("rawContent");
        if (typeof textParam === "string") {
          rawContent = textParam;
        }
      }
    } else {
      const json = await req.json();
      filename = json.filename || filename;
      rawContent = json.rawContent || "";
      fileType = json.fileType as FileType;
    }

    if (!rawContent || !rawContent.trim()) {
      return NextResponse.json(
        { error: "Evidence content cannot be empty" },
        { status: 400 }
      );
    }

    const db = getDb();
    const repo = new EvidenceRepository(db);

    const existingSources = repo.findSourcesByProjectId(projectId);
    const sourceIndex = existingSources.length + 1;
    const sourcePrefix = `SRC-${String(sourceIndex).padStart(2, "0")}`;

    // Run ingestion and chunking
    const ingestion = processEvidenceDocument(
      rawContent,
      filename,
      fileType,
      sourcePrefix
    );

    // Save source record
    const source = repo.createSource({
      projectId,
      filename,
      fileType: ingestion.fileType,
      rawContent,
      sourceHash: ingestion.sourceHash,
      metadataJson: JSON.stringify({ itemCount: ingestion.items.length }),
    });

    // Save chunks
    const chunkInputs = ingestion.chunks.map((c) => ({
      sourceId: source.id,
      projectId,
      chunkIndex: c.chunkIndex,
      stableId: c.stableId,
      textContent: c.textContent,
      author: c.author,
      timestampStr: c.timestampStr,
    }));

    const chunks = repo.createChunks(chunkInputs);

    return NextResponse.json({ source, chunks }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
