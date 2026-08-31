import { getSession } from "@/lib/auth/server";
import { listUsers } from "@/lib/auth/users-store";
import UserManager from "../../components/UserManager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await getSession();
  const users = await listUsers();

  return (
    <div className="px-8 py-7 max-w-[820px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">Vendedores e acessos</h1>
        <p className="text-[13px] text-ink-3 mt-1">
          Crie logins para a equipe comercial e gerencie os acessos. As senhas são
          guardadas com hash — nem o admin as vê depois de criadas.
        </p>
      </div>
      <UserManager initial={users} currentEmail={session?.email ?? ""} />
    </div>
  );
}
