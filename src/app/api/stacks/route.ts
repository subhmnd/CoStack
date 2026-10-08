import { NextRequest, NextResponse } from "next/server";
import { saveStack, globalStackCache } from "@/lib/stack-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, name, nodes, edges } = body;

    if (!slug || !nodes) {
      return NextResponse.json({ error: "Invalid stack data" }, { status: 400 });
    }

    const record = await saveStack(slug, name, nodes, edges || []);

    return NextResponse.json({
      success: true,
      slug: record.slug,
      bashUrl: `/c/${record.slug}`,
      manifest: record.manifestJson,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    count: globalStackCache.size,
  });
}
