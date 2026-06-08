import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SECONDS,
  createAuthSessionToken,
  readAuthSessionFromRequest,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = (process.env.AUTH_ALLOWED_EMAILS || "david.eagan@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const ALLOWED_DOMAIN = (process.env.AUTH_ALLOWED_EMAIL_DOMAIN || "")
  .toLowerCase()
  .replace(/^@/, "");

export async function GET(req: Request) {
  const session = await readAuthSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  return NextResponse.json({
    user: {
      email: session.email,
      name: session.name || null,
      image: session.picture || null,
    },
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  if (!idToken) return NextResponse.json({ error: "missing_id_token" }, { status: 400 });

  const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
  const email = decoded.email?.toLowerCase() || "";
  const verified = decoded.email_verified === true;
  const domain = email.split("@")[1] || "";

  const emailAllowed = ALLOWED_EMAILS.includes(email);
  const domainAllowed = Boolean(ALLOWED_DOMAIN) && domain === ALLOWED_DOMAIN;

  if (!email || !verified || (!emailAllowed && !domainAllowed)) {
    return NextResponse.json({ error: "access_denied" }, { status: 403 });
  }

  const token = await createAuthSessionToken({
    uid: decoded.uid,
    email,
    name: decoded.name || null,
    picture: decoded.picture || null,
  });

  const res = NextResponse.json({
    user: {
      email,
      name: decoded.name || null,
      image: decoded.picture || null,
    },
  });
  res.cookies.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
