export type AuthSession = {
  uid: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  exp: number;
};

export const AUTH_SESSION_COOKIE = "site_chat_session";
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function createAuthSessionToken(
  session: Omit<AuthSession, "exp">,
): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("AUTH_SESSION_SECRET is required");

  const exp = Math.floor(Date.now() / 1000) + AUTH_SESSION_MAX_AGE_SECONDS;
  const header = base64UrlEncodeJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlEncodeJson({ ...session, exp });
  const input = `${header}.${payload}`;
  const signature = await sign(input, secret);
  return `${input}.${signature}`;
}

export async function verifyAuthSessionToken(token: string): Promise<AuthSession | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const ok = await verify(`${header}.${payload}`, signature, secret);
  if (!ok) return null;

  try {
    const session = JSON.parse(decoder.decode(base64UrlToBytes(payload))) as AuthSession;
    if (!session.uid || !session.email || !session.exp) return null;
    if (session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function readAuthSessionFromRequest(req: Request): Promise<AuthSession | null> {
  const token = getCookie(req.headers.get("cookie") || "", AUTH_SESSION_COOKIE);
  return token ? verifyAuthSessionToken(token) : null;
}

function getSessionSecret() {
  return process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET || "";
}

async function sign(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verify(input: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature),
    encoder.encode(input),
  );
}

function base64UrlEncodeJson(value: unknown) {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getCookie(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
