import { NextRequest, NextResponse } from "next/server";
import { resolveSoftware, SearchResultItem } from "@/lib/search-resolver";

export type { SearchResultItem };

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() || "";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const noCache = req.nextUrl.searchParams.get("nocache") === "1" || req.nextUrl.searchParams.has("fresh");
  const results = await resolveSoftware(query, noCache);

  return NextResponse.json({ results });
}
