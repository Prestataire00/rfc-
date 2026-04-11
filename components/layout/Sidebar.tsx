"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Building2, BookOpen, CalendarDays, GraduationCap,
  TrendingUp, FileText, ClipboardList, BarChart3, Calendar, FolderOpen,
  MessageSquare, Award, LogOut, Shield, X, Settings, BadgeCheck, CreditCard, UserPlus, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };

const adminDashboard: NavItem = { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard };

const adminNavGroups: NavGroup[] = [
  {
    label: "CRM",
    items: [
      { href: "/contacts", label: "Contacts / Stagiaires", icon: Users },
      { href: "/entreprises", label: "Entreprises / Clients", icon: Building2 },
      { href: "/besoins", label: "Besoins", icon: ClipboardList },
    ],
  },
  {
    label: "Pédagogie",
    items: [
      { href: "/formations", label: "Formations", icon: BookOpen },
      { href: "/lieux-formation", label: "Lieux de formation", icon: MapPin },
      { href: "/sessions", label: "Sessions", icon: CalendarDays },
      { href: "/formateurs", label: "Formateurs", icon: GraduationCap },
    ],
  },
  {
    label: "Commercial",
    items: [
      { href: "/commercial", label: "Devis & Factures", icon: TrendingUp },
      { href: "/bpf", label: "BPF", icon: BarChart3 },
    ],
  },
  {
    label: "Qualité",
    items: [
      { href: "/evaluations", label: "Évaluations", icon: MessageSquare },
      { href: "/qualiopi", label: "Qualiopi", icon: BadgeCheck },
      { href: "/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/utilisateurs", label: "Utilisateurs", icon: Shield },
      { href: "/parametres", label: "Paramètres", icon: Settings },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
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
  { href: "/espace-client/inscriptions", label: "Inscriptions", icon: UserPlus },
  { href: "/espace-client/documents", label: "Documents", icon: FolderOpen },
  { href: "/espace-client/devis", label: "Devis", icon: FileText },
  { href: "/espace-client/paiement", label: "Paiement", icon: CreditCard },
  { href: "/espace-client/evaluations", label: "Évaluations", icon: MessageSquare },
];

const flatNavByRole: Record<string, NavItem[]> = { formateur: formateurNav, client: clientNav };
const roleLabels: Record<string, string> = { admin: "Administrateur", formateur: "Formateur", client: "Client" };

export function Sidebar({ role, userName, mobileOpen, onClose }: { role: string; userName: string; mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const flatItems = flatNavByRole[role];

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const renderNavLink = ({ href, label, icon: Icon }: NavItem) => {
    const dashboards = ["/dashboard", "/espace-formateur", "/espace-client"];
    const isActive = pathname === href || (!dashboards.includes(href) && pathname.startsWith(href));
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
  };

  const sidebarContent = (
    <aside className={cn(
      "flex flex-col bg-white dark:bg-gray-900 h-full",
      "lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64",
      "w-72"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex items-center gap-2">
          <Image src="/logorescue.png" alt="RFC" width={44} height={44} className="rounded-lg" />
          <div>
            <span className="font-bold text-black dark:text-white text-sm">RFC</span>
            <span className="block text-[9px] text-gray-600 dark:text-gray-400 leading-tight">Sécurité - Incendie</span>
            <span className="block text-[9px] text-gray-600 dark:text-gray-400 leading-tight">Prévention</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        {isAdmin ? (
          <>
            {renderNavLink(adminDashboard)}
            {adminNavGroups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? "mt-2" : "mt-3"}>
                <hr className="border-gray-200 dark:border-gray-700 mb-2" />
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(renderNavLink)}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-1">
            {(flatItems ?? []).map(renderNavLink)}
          </div>
        )}
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
