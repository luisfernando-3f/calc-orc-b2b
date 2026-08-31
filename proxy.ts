import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth/session";

// Proteção de acesso por sessão (cookie assinado). Redireciona páginas não
// autenticadas para /login e bloqueia /admin para quem não é admin. As rotas de
// API também revalidam a sessão por conta própria (defesa em profundidade).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proposta pública (link do cliente) + registro de abertura — sem login.
  if (pathname.startsWith("/p/") || pathname === "/api/share/view") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  const isApi = pathname.startsWith("/api");
  const isLoginApi = pathname.startsWith("/api/auth/login");

  // ---- não autenticado ----
  if (!session) {
    if (pathname === "/login" || isLoginApi) return NextResponse.next();
    if (isApi) {
      return NextResponse.json({ error: "não autenticado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // ---- autenticado ----
  // já logado tentando ver /login -> manda pra home do papel
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = session.role === "admin" ? "/admin" : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // área admin só para admin
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
