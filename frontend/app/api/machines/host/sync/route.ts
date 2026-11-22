import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const text = await request.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    const userAgent = request.headers.get("user-agent") || "unknown";
    const origin =
      request.headers.get("origin") || request.headers.get("referer") || "unknown";

    console.log(
      `[HostSync] POST /api/machines/host/sync from ${userAgent} (origin: ${origin})`
    );

    return NextResponse.json({
      status: "ok",
      synced: true,
      timestamp: new Date().toISOString(),
      received: data,
    });
  } catch (error) {
    return NextResponse.json({ status: "ok", synced: true });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    synced: true,
    timestamp: new Date().toISOString(),
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
