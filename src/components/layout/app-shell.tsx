import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNavForRole } from "@/config/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export async function AppShell({ children, requiredRole }: AppShellProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/connexion");
  }

  const role = session.user.role;

  if (requiredRole && role !== requiredRole && role !== "ADMIN") {
    redirect("/connexion");
  }

  const navItems = getNavForRole(role);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar items={navItems} />
      <div className="md:pl-64">
        <Header user={session.user} navItems={navItems} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
