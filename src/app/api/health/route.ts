import { NextResponse } from "next/server";
import { OllamaClient } from "@/lib/ollama/client";

export async function GET() {
  try {
    const client = new OllamaClient();
    const health = await client.checkHealth();
    return NextResponse.json({
      ...health,
      configuredModel: client.getModel(),
      baseUrl: client.getBaseUrl(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        availableModels: [],
        selectedModelAvailable: false,
      },
      { status: 500 }
    );
  }
}
