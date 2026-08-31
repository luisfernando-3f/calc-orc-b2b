"use client";

import { useState, type ReactNode } from "react";

/* ---------------- Card ---------------- */
export function Card({
  title,
  sub,
  children,
  step,
}: {
  title: string;
  sub?: ReactNode;
  children: ReactNode;
  step?: number;
}) {
  return (
    <section className="bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] p-6 md:p-7 mb-5">
      <div className="mb-4">
        <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2.5 m-0">
          {step !== undefined && (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-ink-2 text-[12px] font-bold tabular">
              {step}
            </span>
          )}
          {title}
        </h2>
        {sub && <p className="text-[13px] text-ink-3 mt-1.5 leading-relaxed m-0">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

/* ---------------- Field wrapper ---------------- */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="block text-[12.5px] font-semibold text-ink-2 mb-1.5"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-ink-3 mt-1.5 leading-snug m-0">{hint}</p>}
    </div>
  );
}

const inputBase =
  "w-full border-[1.5px] border-line rounded-lg px-3 py-2.5 text-[14px] text-ink bg-surface transition-colors focus:outline-none focus:border-brand tabular";

/* ---------------- Text input ---------------- */
export function TextInput({
  id,
  value,
  onValue,
  placeholder,
}: {
  id?: string;
  value: string;
  onValue: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      className={inputBase.replace(" tabular", "")}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onValue(e.target.value)}
    />
  );
}

/* ---------------- Number input ----------------
   Trata 0 como "não preenchido" (mostra placeholder). Enquanto focado,
   preserva o texto cru para permitir digitar "14," ou "14." sem brigar com
   o valor controlado. Aceita vírgula como separador decimal (pt-BR). */
export function NumberInput({
  id,
  value,
  onValue,
  placeholder,
  prefix,
  suffix,
  blankWhenZero = true,
  invalid = false,
  step,
}: {
  id?: string;
  value: number;
  onValue: (v: number) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  blankWhenZero?: boolean;
  invalid?: boolean;
  step?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");
  const display = focused ? raw : value === 0 && blankWhenZero ? "" : String(value);

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[13px] pointer-events-none tabular">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        className={`${inputBase} ${prefix ? "pl-9" : ""} ${suffix ? "pr-9" : ""} ${
          invalid ? "border-neg focus:border-neg" : ""
        }`}
        value={display}
        placeholder={placeholder}
        onFocus={() => {
          setFocused(true);
          setRaw(value === 0 && blankWhenZero ? "" : String(value));
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const s = e.target.value;
          setRaw(s);
          const n = s === "" ? 0 : Number(s.replace(",", "."));
          onValue(Number.isFinite(n) ? n : 0);
        }}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 text-[13px] pointer-events-none tabular">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ---------------- Pill tabs (modo) ---------------- */
export function PillTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex gap-1 bg-surface-alt p-1 rounded-full">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 py-2 rounded-full text-[13.5px] font-semibold transition-colors ${
            value === o.value
              ? "bg-brand text-white"
              : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
