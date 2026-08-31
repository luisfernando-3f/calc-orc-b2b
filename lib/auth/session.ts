// Sessão via cookie httpOnly assinado (HMAC-SHA256). Usa Web Crypto, que roda
// tanto no middleware (proxy.ts, edge) quanto em route handlers / server
// components (Node). Sem dependência externa.

import type { Role } from "./users";

export const COOKIE_NAME = "seed_session";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

const SECRET =
  process.env.AUTH_SECRET || "dev-secret-troque-em-producao-seed-3f-venture";

export interface SessionPayload {
  email: string;
  nome: string;
  role: Role;
  iat: number;
}

const enc = new TextEncoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(s: string): Uint8Array {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const strToB64url = (str: string) => bytesToB64url(enc.encode(str));
const b64urlToStr = (s: string) => new TextDecoder().decode(b64urlToBytes(s));

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = strToB64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    enc.encode(body) as BufferSource,
  );
  return `${body}.${bytesToB64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      b64urlToBytes(sig) as BufferSource,
      enc.encode(body) as BufferSource,
    );
    if (!ok) return null;
    return JSON.parse(b64urlToStr(body)) as SessionPayload;
  } catch {
    return null;
  }
}
