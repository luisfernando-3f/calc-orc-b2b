"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/auth/users";
import LogoutButton from "./LogoutButton";

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { title?: string; items: NavItem[] };

function navFor(role: Role): NavGroup[] {
  const base: NavItem[] = [
    { href: role === "admin" ? "/admin" : "/painel", label: "Painel", icon: "▦" },
    { href: "/", label: "Calculadora de Retorno", icon: "⊞" },
    { href: "/consultiva", label: "Tabela Consultiva", icon: "⊟" },
    { href: "/cases", label: "Cases e Projetos", icon: "◫" },
  ];
  if (role === "admin") {
    return [
      { items: base },
      {
        title: "Administração",
        items: [
          { href: "/admin/ponto-de-partida", label: "Ponto de partida", icon: "◧" },
          { href: "/admin/campanhas", label: "Campanhas", icon: "◎" },
          { href: "/admin/cases", label: "Cases", icon: "◫" },
          { href: "/admin/usuarios", label: "Vendedores", icon: "◉" },
          { href: "/admin/historico", label: "Histórico geral", icon: "≣" },
        ],
      },
    ];
  }
  return [
    { items: [...base, { href: "/historico", label: "Histórico", icon: "≣" }] },
  ];
}

function isActive(pathname: string, href: string): boolean {
  // "/" e "/admin" são exatos (senão casariam com sub-rotas /admin/...).
  if (href === "/" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar({ role, nome }: { role: Role; nome: string }) {
  const pathname = usePathname();
  // Sempre abre expandida ao carregar (estado não persiste).
  const [collapsed, setCollapsed] = useState(false);
  const groups = navFor(role);

  return (
    <aside
      className={`${
        collapsed ? "w-[64px]" : "w-[240px]"
      } shrink-0 h-full bg-brand text-white flex flex-col no-print transition-[width] duration-200 ease-out`}
    >
      {/* Marca */}
      <div
        className={`h-14 flex items-center border-b border-white/10 ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-5"
        }`}
      >
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white text-brand text-[13px] font-black">
          3F
        </span>
        {!collapsed && (
          <>
            <span className="text-[15px] font-semibold">SEED</span>
            {role === "admin" && (
              <span className="text-[10px] uppercase tracking-wide text-white/40 font-semibold mt-0.5">
                Admin
              </span>
            )}
          </>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.title && !collapsed && (
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                {group.title}
              </div>
            )}
            {group.title && collapsed && gi > 0 && (
              <div className="mx-2 mb-2 h-px bg-white/10" />
            )}
            {group.items.map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={collapsed ? it.label : undefined}
                  className={`flex items-center gap-2.5 rounded-md text-[13.5px] font-medium transition-colors ${
                    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
                  } ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="text-[14px] w-4 text-center opacity-80 shrink-0">
                    {it.icon}
                  </span>
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Usuário + logout */}
      <div
        className={`border-t border-white/10 ${
          collapsed ? "p-3 flex flex-col items-center gap-1" : "p-4"
        }`}
      >
        {!collapsed && (
          <div className="text-[12px] text-white/60 mb-2 px-1 truncate" title={nome}>
            {nome}
          </div>
        )}
        <LogoutButton
          collapsed={collapsed}
          className={
            collapsed
              ? "text-[16px] leading-none text-white/70 hover:text-white transition-colors h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/10"
              : "text-[13px] font-medium text-white/70 hover:text-white transition-colors px-1"
          }
        />
      </div>

      {/* Toggle minimizar (seta no fim da barra) */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? "Expandir" : "Minimizar"}
        aria-label={collapsed ? "Expandir menu" : "Minimizar menu"}
        className={`shrink-0 border-t border-white/10 py-2.5 flex items-center text-white/45 hover:text-white hover:bg-white/10 transition-colors ${
          collapsed ? "justify-center" : "justify-end px-4"
        }`}
      >
        <span className="text-[16px] leading-none">{collapsed ? "»" : "«"}</span>
      </button>
    </aside>
  );
}
