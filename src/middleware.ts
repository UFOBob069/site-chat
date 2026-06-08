import { NextResponse, type NextRequest } from "next/server";
import { readAuthSessionFromRequest } from "@/lib/session";

// Gates the admin UI and admin REST API behind a valid Firebase-backed
// app session. Public widget endpoints (/api/leads, /api/widget-config,
// /api/auth/*) are NOT matched here; see the matcher below.
export async function middleware(req: NextRequest) {
  const session = await readAuthSessionFromRequest(req);
  if (session) return NextResponse.next();

  const isApi = req.nextUrl.pathname.startsWith("/api/");
  if (isApi) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
