import { NextResponse } from "next/server";
import { saveTravelMongoRecord } from "@/lib/mongodb";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Travel endpoint is ready. Use POST to persist selections.",
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const mongoResult = await saveTravelMongoRecord(payload);
    return NextResponse.json({
      ok: true,
      mongo: mongoResult,
      saved: payload,
    });
  } catch (error) {
    console.error("Travel API error:", error);
    return NextResponse.json({ ok: false, message: "Payload failed validation." }, { status: 400 });
  }
}
