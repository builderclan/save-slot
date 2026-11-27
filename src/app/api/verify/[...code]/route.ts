import { NextResponse } from "next/server";
import { getPublicVerifyPayload } from "@/server/reports";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string[] }> }
) {
  try {
    const { code } = await params;
    const refCode = code.map((s) => decodeURIComponent(s)).join("/");
    const result = await getPublicVerifyPayload(refCode);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (err: unknown) {
    console.error("[GET /api/verify/[...code]] Error:", err);
    return NextResponse.json({ error: "Failed to verify event reference" }, { status: 500 });
  }
}
