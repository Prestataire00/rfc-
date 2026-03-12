"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  CalendarDays,
  GraduationCap,
  TrendingUp,
  FileText,
  ClipboardList,
  BarChart3,
  Calendar,
  FolderOpen,
  MessageSquare,
  Award,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const adminNav: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/formations", label: "Formations", icon: BookOpen },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/besoins", label: "Besoins", icon: ClipboardList },
  { href: "/contacts", label: "Contacts / Stagiaires", icon: Users },
  { href: "/entreprises", label: "Entreprises / Clients", icon: Building2 },
  { href: "/formateurs", label: "Formateurs", icon: GraduationCap },
  { href: "/commercial", label: "Devis & Factures", icon: TrendingUp },
  { href: "/evaluations", label: "Evaluations", icon: MessageSquare },
  { href: "/bpf", label: "BPF", icon: BarChart3 },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Shield },
];

const formateurNav: NavItem[] = [
  { href: "/espace-formateur", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/espace-formateur/planning", label: "Mon Planning", icon: Calendar },
  { href: "/espace-formateur/disponibilites", label: "Disponibilites", icon: CalendarDays },
  { href: "/espace-formateur/sessions", label: "Mes Sessions", icon: BookOpen },
  { href: "/espace-formateur/documents", label: "Mes Documents", icon: FileText },
  { href: "/espace-formateur/feedbacks", label: "Feedbacks", icon: MessageSquare },
  { href: "/espace-formateur/attestations", label: "Attestations", icon: Award },
];

const clientNav: NavItem[] = [
  { href: "/espace-client", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/espace-client/formations", label: "Nos Formations", icon: BookOpen },
  { href: "/espace-client/stagiaires", label: "Nos Stagiaires", icon: Users },
  { href: "/espace-client/documents", label: "Documents", icon: FolderOpen },
  { href: "/espace-client/devis", label: "Devis", icon: FileText },
  { href: "/espace-client/evaluations", label: "Evaluations", icon: MessageSquare },
];

const navByRole: Record<string, NavItem[]> = {
  admin: adminNav,
  formateur: formateurNav,
  client: clientNav,
};

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  formateur: "Formateur",
  client: "Client",
};

export function Sidebar({ role, userName }: { role: string; userName: string }) {
  const pathname = usePathname();
  const items = navByRole[role] || adminNav;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r bg-white flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
          FP
        </div>
        <div>
          <span className="font-semibold text-gray-900 text-sm">FormaPro</span>
          <span className="block text-[10px] text-gray-400">{roleLabels[role] || role}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/dashboard" && href !== "/espace-formateur" && href !== "/espace-client" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-gray-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
            {userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-400">{roleLabels[role]}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </button>
      </div>
    </aside>
  );
}
