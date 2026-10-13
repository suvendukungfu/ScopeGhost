import { NextResponse } from "next/server";
import { getTigerTelemetry } from "@/lib/tiger/client";
import { getVerifiedSnapshot } from "@/lib/tiger/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const telemetry = await getTigerTelemetry();
    return NextResponse.json(telemetry);
  } catch (err: unknown) {
    console.error("[api/tiger-telemetry] Internal error:", err);
    return NextResponse.json(
      getVerifiedSnapshot(
        "Internal server error while resolving telemetry. Displaying verified synthetic snapshot."
      ),
      { status: 200 }
    );
  }
}
