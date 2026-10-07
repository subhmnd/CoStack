import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Match /c/[slug]
  if (pathname.startsWith("/c/") && !pathname.includes("/raw")) {
    const userAgent = (req.headers.get("user-agent") || "").toLowerCase();
    const isCli =
      userAgent.includes("curl") ||
      userAgent.includes("wget") ||
      userAgent.includes("httpie") ||
      req.headers.get("accept")?.includes("text/plain");

    if (isCli) {
      const slug = pathname.replace("/c/", "");
      const rewriteUrl = new URL(`/api/c/${slug}/raw`, req.url);
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/c/:path*"],
};
