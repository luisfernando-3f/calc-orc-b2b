import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession, type SessionPayload } from "./session";

/** Sessão atual em server components / route handlers (lê o cookie). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}

/** Sessão exigindo papel admin (senão null). */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const s = await getSession();
  return s && s.role === "admin" ? s : null;
}
