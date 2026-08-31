"use client";

import { useState } from "react";
import type { DealStatus } from "@/lib/types";

const OPTS: { v: DealStatus; label: string }[] = [
  { v: "aberta", label: "Em aberto" },
  { v: "ganho", label: "Ganho" },
  { v: "perdido", label: "Perdido" },
];

export default function StatusSelect({
  id,
  status,
}: {
  id: string;
  status: DealStatus;
}) {
  const [val, setVal] = useState<DealStatus>(status);
  const [saving, setSaving] = useState(false);

  const change = async (novo: DealStatus) => {
    const prev = val;
    setVal(novo);
    setSaving(true);
    try {
      const res = await fetch("/api/simulations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: novo }),
      });
      if (!res.ok) setVal(prev);
    } catch {
      setVal(prev);
    } finally {
      setSaving(false);
    }
  };

  const cor =
    val === "ganho"
      ? { bg: "var(--pos-bg)", fg: "var(--pos)" }
      : val === "perdido"
        ? { bg: "var(--neg-bg)", fg: "var(--neg)" }
        : { bg: "var(--surface-alt)", fg: "var(--ink-2)" };

  return (
    <select
      value={val}
      disabled={saving}
      onChange={(e) => change(e.target.value as DealStatus)}
      style={{ background: cor.bg, color: cor.fg }}
      className="text-[12px] font-semibold rounded-md border border-line px-2 py-1 focus:outline-none focus:border-brand cursor-pointer disabled:opacity-60"
    >
      {OPTS.map((o) => (
        <option key={o.v} value={o.v} style={{ background: "#fff", color: "var(--ink)" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
