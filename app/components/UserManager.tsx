"use client";

import { useState } from "react";
import type { Role, User } from "@/lib/auth/users";

type Draft = { email: string; nome: string; role: Role; senha: string };

export default function UserManager({
  initial,
  currentEmail,
}: {
  initial: User[];
  currentEmail: string;
}) {
  const [users, setUsers] = useState<User[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  // e-mail em edição (senha vira "redefinir", opcional); null = criando novo
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  };
  const flash = (m: string, isErro = false) => {
    setMsg(m);
    setErro(isErro);
  };

  const novo = () => {
    setEditEmail(null);
    setDraft({ email: "", nome: "", role: "vendedor", senha: "" });
    setMsg("");
  };
  const editar = (u: User) => {
    setEditEmail(u.email);
    setDraft({ email: u.email, nome: u.nome, role: u.role, senha: "" });
    setMsg("");
  };

  const salvar = async () => {
    if (!draft) return;
    setBusy(true);
    setMsg("");
    try {
      const editando = editEmail !== null;
      const res = await fetch("/api/users", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash(data.error || "Erro ao salvar.", true);
      } else {
        await refresh();
        setDraft(null);
        setEditEmail(null);
        flash(editando ? "Acesso atualizado." : "Vendedor criado.");
      }
    } catch {
      flash("Falha de conexão.", true);
    } finally {
      setBusy(false);
    }
  };

  const excluir = async (email: string) => {
    if (!confirm(`Excluir o acesso de ${email}?`)) return;
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) flash(data.error || "Erro ao excluir.", true);
    else {
      await refresh();
      flash("Acesso removido.");
    }
  };

  const upd = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const inputCls =
    "w-full border-[1.5px] border-line rounded-md px-2.5 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-brand";
  const cardCls =
    "bg-surface border border-line rounded-[var(--radius)] shadow-[var(--shadow)] p-6 mb-5";

  return (
    <div>
      {/* Lista */}
      <section className={cardCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold text-ink">Acessos</h2>
          {!draft && (
            <button
              type="button"
              onClick={novo}
              className="text-[13px] font-semibold text-white bg-brand rounded-md px-3.5 py-2 hover:bg-brand-2 transition-colors"
            >
              + Novo vendedor
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="text-ink-3 text-[11.5px] uppercase tracking-wide text-left">
                <th className="py-2 pr-3 font-bold">Nome</th>
                <th className="py-2 px-3 font-bold">E-mail</th>
                <th className="py-2 px-3 font-bold">Perfil</th>
                <th className="py-2 pl-3 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-t border-line">
                  <td className="py-2.5 pr-3 font-semibold text-ink">{u.nome}</td>
                  <td className="py-2.5 px-3 text-ink-2">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                        u.role === "admin"
                          ? "bg-accent-bg text-brand"
                          : "bg-surface-alt text-ink-2"
                      }`}
                    >
                      {u.role === "admin" ? "Admin" : "Vendedor"}
                    </span>
                    {u.senhaPadrao && (
                      <span
                        className="ml-2 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-neg-bg text-neg"
                        title="Este acesso ainda usa a senha inicial 1234"
                      >
                        senha padrão
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => editar(u)}
                      className="text-[12.5px] font-semibold text-brand hover:underline mr-3"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => excluir(u.email)}
                      disabled={u.email.toLowerCase() === currentEmail.toLowerCase()}
                      className="text-[12.5px] font-semibold text-neg hover:underline disabled:text-ink-3 disabled:no-underline disabled:cursor-not-allowed"
                      title={
                        u.email.toLowerCase() === currentEmail.toLowerCase()
                          ? "Você não pode excluir a si mesmo"
                          : "Excluir"
                      }
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {msg && (
          <p className={`text-[12.5px] mt-3 ${erro ? "text-neg" : "text-pos"}`}>{msg}</p>
        )}
      </section>

      {/* Formulário */}
      {draft && (
        <section className={cardCls}>
          <h2 className="text-[16px] font-semibold text-ink mb-4">
            {editEmail ? "Editar acesso" : "Novo vendedor"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
                Nome
              </span>
              <input
                type="text"
                value={draft.nome}
                onChange={(e) => upd({ nome: e.target.value })}
                placeholder="Nome do vendedor"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
                E-mail
              </span>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => upd({ email: e.target.value })}
                placeholder="vendedor@3fventure.com.br"
                disabled={editEmail !== null}
                className={`${inputCls} disabled:bg-surface-alt disabled:text-ink-3`}
              />
            </label>
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
                {editEmail ? "Nova senha (deixe em branco p/ manter)" : "Senha"}
              </span>
              <input
                type="text"
                value={draft.senha}
                onChange={(e) => upd({ senha: e.target.value })}
                placeholder={editEmail ? "•••• (opcional)" : "mín. 4 caracteres"}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-ink-2 mb-1.5">
                Perfil
              </span>
              <select
                value={draft.role}
                onChange={(e) => upd({ role: e.target.value as Role })}
                className={inputCls}
              >
                <option value="vendedor">Vendedor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setEditEmail(null);
              }}
              className="text-[14px] font-semibold text-brand border-[1.5px] border-brand rounded-lg px-5 py-2.5 hover:bg-surface-alt transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={busy}
              className="text-[14px] font-semibold text-white bg-brand rounded-lg px-6 py-2.5 hover:bg-brand-2 transition-colors disabled:opacity-60"
            >
              {busy ? "Salvando…" : editEmail ? "Salvar" : "Criar vendedor"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
