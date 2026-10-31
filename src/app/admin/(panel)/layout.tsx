import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const repo = await getRepo();
  return <AdminShell demo={repo.mode === "memory"}>{children}</AdminShell>;
}
