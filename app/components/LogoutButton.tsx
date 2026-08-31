"use client";

import { useState } from "react";

export default function LogoutButton({
  className = "",
  collapsed = false,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const logout = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };
  const label = loading ? (collapsed ? "…" : "Saindo…") : collapsed ? "⎋" : "Sair";
  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      title="Sair"
      className={className || "text-[13px] font-medium text-white/70 hover:text-white transition-colors"}
    >
      {label}
    </button>
  );
}
