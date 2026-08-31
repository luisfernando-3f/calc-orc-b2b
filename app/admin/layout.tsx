import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import Sidebar from "../components/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/");

  return (
    <div className="h-screen overflow-hidden flex">
      <Sidebar role={session.role} nome={session.nome} />
      <div className="flex-1 min-w-0 overflow-y-auto bg-bg">{children}</div>
    </div>
  );
}
