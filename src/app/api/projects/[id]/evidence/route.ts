import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { EvidenceRepository } from "@/lib/db/repositories/evidence";
import {
  processEvidenceDocument,
  UnsupportedEvidenceFormatError,
} from "@/lib/ingestion";
import { EvidenceUploadRequestSchema, UploadEvidenceSourceSchema } from "@/lib/types/schemas";
import { ProjectRepository } from "@/lib/db/repositories/projects";
import { FileType } from "@/lib/types";
import crypto from "node:crypto";

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
    let metadata: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (file && typeof file === "object" && "text" in file) {
        const uploadedFile = file as File;
        if (uploadedFile.size > 10_000_000) {
          return NextResponse.json(
            { error: "Evidence file exceeds the 10 MB import limit" },
            { status: 413 }
          );
        }
        filename = uploadedFile.name || filename;
        rawContent = await uploadedFile.text();
        metadata = {
          originalFilename: uploadedFile.name,
          fileSizeBytes: uploadedFile.size,
          contentType: uploadedFile.type || null,
        };
      } else {
        const textParam = formData.get("rawContent");
        if (typeof textParam === "string") {
          rawContent = textParam;
        }
        const filenameParam = formData.get("filename");
        if (typeof filenameParam === "string") filename = filenameParam;
      }
    } else {
      let payload: unknown;
      try {
        payload = await req.json();
      } catch {
        return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
      }
      const parsed = EvidenceUploadRequestSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.issues },
          { status: 400 }
        );
      }
      filename = parsed.data.filename || filename;
      rawContent = parsed.data.rawContent;
      fileType = parsed.data.fileType;
      metadata = parsed.data.metadata;
    }

    const validatedUpload = EvidenceUploadRequestSchema.safeParse({
      filename,
      ...(fileType ? { fileType } : {}),
      rawContent,
      metadata,
    });
    if (!validatedUpload.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validatedUpload.error.issues },
        { status: 400 }
      );
    }
    filename = validatedUpload.data.filename || filename;
    rawContent = validatedUpload.data.rawContent;
    fileType = validatedUpload.data.fileType;
    metadata = validatedUpload.data.metadata;

    if (!rawContent || !rawContent.trim()) {
      return NextResponse.json(
        { error: "Evidence file is empty. Add text before importing." },
        { status: 400 }
      );
    }

    const db = getDb();
    const project = new ProjectRepository(db).findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const repo = new EvidenceRepository(db);

    const sourceStableId = `DOC-${crypto.randomUUID()}`;

    // Imported content remains untrusted; normalization produces citations, not executable markup.
    const ingestion = processEvidenceDocument(
      rawContent,
      filename,
      fileType,
      sourceStableId
    );

    const sourceInput = UploadEvidenceSourceSchema.safeParse({
      filename,
      fileType: ingestion.fileType,
      rawContent,
      metadata: {
        ...metadata,
        importedAt: new Date().toISOString(),
        itemCount: ingestion.items.length,
        normalizationWarnings: ingestion.normalizationWarnings,
      },
    });
    if (!sourceInput.success) {
      return NextResponse.json(
        { error: "Validation failed", details: sourceInput.error.issues },
        { status: 400 }
      );
    }

    const created = repo.createSourceWithChunks({
      projectId,
      stableId: sourceStableId,
      filename: sourceInput.data.filename,
      fileType: sourceInput.data.fileType,
      rawContent: sourceInput.data.rawContent,
      sourceHash: ingestion.sourceHash,
      metadata: sourceInput.data.metadata,
    }, ingestion.chunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      stableId: chunk.stableId,
      textContent: chunk.textContent,
      author: chunk.author,
      timestampStr: chunk.timestampStr,
      metadata: chunk.metadata,
    })), {
      itemCount: ingestion.items.length,
      normalized: ingestion.normalizationWarnings.length > 0,
    });

    return NextResponse.json({
      ...created,
      warnings: ingestion.normalizationWarnings,
      untrusted: true,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof UnsupportedEvidenceFormatError
      ? 415
      : message.includes("Malformed CSV") || message.includes("empty")
        ? 400
        : message.includes("Duplicate")
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
