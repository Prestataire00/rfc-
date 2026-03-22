"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Building2, BookOpen, CalendarDays, GraduationCap,
  TrendingUp, FileText, ClipboardList, BarChart3, Calendar, FolderOpen,
  MessageSquare, Award, LogOut, Shield, X, Settings, BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };

const adminNav: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/formations", label: "Formations", icon: BookOpen },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/besoins", label: "Besoins", icon: ClipboardList },
  { href: "/contacts", label: "Contacts / Stagiaires", icon: Users },
  { href: "/entreprises", label: "Entreprises / Clients", icon: Building2 },
  { href: "/formateurs", label: "Formateurs", icon: GraduationCap },
  { href: "/commercial", label: "Devis & Factures", icon: TrendingUp },
  { href: "/evaluations", label: "Évaluations", icon: MessageSquare },
  { href: "/bpf", label: "BPF", icon: BarChart3 },
  { href: "/qualiopi", label: "Qualiopi", icon: BadgeCheck },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Shield },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

const formateurNav: NavItem[] = [
  { href: "/espace-formateur", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/espace-formateur/planning", label: "Mon Planning", icon: Calendar },
  { href: "/espace-formateur/disponibilites", label: "Disponibilités", icon: CalendarDays },
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
  { href: "/espace-client/evaluations", label: "Évaluations", icon: MessageSquare },
];

const navByRole: Record<string, NavItem[]> = { admin: adminNav, formateur: formateurNav, client: clientNav };
const roleLabels: Record<string, string> = { admin: "Administrateur", formateur: "Formateur", client: "Client" };

export function Sidebar({ role, userName, mobileOpen, onClose }: { role: string; userName: string; mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const items = navByRole[role] || adminNav;

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const sidebarContent = (
    <aside className={cn(
      "flex flex-col bg-white dark:bg-gray-900 h-full",
      // Desktop: fixed sidebar
      "lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64",
      // Mobile: full width
      "w-72"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex items-center gap-2">
          <div className="bg-gray-900 dark:bg-transparent rounded-lg p-0.5">
              <Image src="/logo-rfc.png" alt="RFC" width={38} height={38} className="rounded-lg" />
            </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">RFC</span>
            <span className="block text-[10px] text-gray-500 dark:text-gray-400">{roleLabels[role] || role}</span>
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        )}
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
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-red-100 dark:bg-red-700/20 text-red-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-red-400" : "text-gray-500 dark:text-gray-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-400 font-semibold text-xs">
            {userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabels[role]}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {"Déconnexion"}
        </button>
      </div>
    </aside>
  );

  // Mobile: overlay + drawer
  if (mobileOpen !== undefined) {
    return (
      <>
        {/* Desktop sidebar - always visible */}
        <div className="hidden lg:block">
          {sidebarContent}
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="fixed inset-y-0 left-0 z-50 animate-in slide-in-from-left duration-200">
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return sidebarContent;
}
