"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Building2, BookOpen, CalendarDays, GraduationCap,
  TrendingUp, FileText, ClipboardList, BarChart3, Calendar, FolderOpen,
  MessageSquare, Award, LogOut, Shield, X, Settings, BadgeCheck, CreditCard,
  UserPlus, MapPin, ChevronDown, UserCheck, UserSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavItemWithSub = NavItem & { children?: NavItem[] };
type NavGroup = { label: string; items: NavItemWithSub[] };

const adminDashboard: NavItem = { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard };

const adminNavGroups: NavGroup[] = [
  {
    label: "CRM",
    items: [
      {
        href: "/contacts", label: "Contacts", icon: Users,
        children: [
          { href: "/contacts", label: "Tous les contacts", icon: Users },
          { href: "/contacts?type=stagiaire", label: "Stagiaires", icon: GraduationCap },
          { href: "/contacts?type=client", label: "Clients", icon: UserCheck },
          { href: "/contacts?type=prospect", label: "Prospects", icon: UserSearch },
          { href: "/entreprises", label: "Entreprises", icon: Building2 },
        ],
      },
      { href: "/besoins", label: "Besoins", icon: ClipboardList },
    ],
  },
  {
    label: "Pedagogie",
    items: [
      {
        href: "/formations", label: "Formations", icon: BookOpen,
        children: [
          { href: "/formations", label: "Catalogue", icon: BookOpen },
          { href: "/lieux-formation", label: "Lieux de formation", icon: MapPin },
        ],
      },
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
    label: "Qualite",
    items: [
      { href: "/evaluations", label: "Evaluations", icon: MessageSquare },
      { href: "/qualiopi", label: "Qualiopi", icon: BadgeCheck },
      { href: "/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/utilisateurs", label: "Utilisateurs", icon: Shield },
      { href: "/parametres", label: "Parametres", icon: Settings },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
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
  { href: "/espace-client/inscriptions", label: "Inscriptions", icon: UserPlus },
  { href: "/espace-client/documents", label: "Documents", icon: FolderOpen },
  { href: "/espace-client/devis", label: "Devis", icon: FileText },
  { href: "/espace-client/paiement", label: "Paiement", icon: CreditCard },
  { href: "/espace-client/evaluations", label: "Evaluations", icon: MessageSquare },
];

const flatNavByRole: Record<string, NavItem[]> = { formateur: formateurNav, client: clientNav };
const roleLabels: Record<string, string> = { admin: "Administrateur", formateur: "Formateur", client: "Client" };

export function Sidebar({ role, userName, mobileOpen, onClose }: { role: string; userName: string; mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = role === "admin";
  const flatItems = flatNavByRole[role];

  const currentType = searchParams.get("type") ?? "";

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of adminNavGroups) {
      for (const item of group.items) {
        if (item.children) {
          const isChildActive = item.children.some((c) => {
            const [basePath] = c.href.split("?");
            return pathname.startsWith(basePath);
          });
          if (isChildActive) initial[item.label] = true;
        }
      }
    }
    return initial;
  });

  const toggleExpand = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const isLinkActive = (href: string) => {
    const dashboards = ["/dashboard", "/espace-formateur", "/espace-client"];
    const [basePath, query] = href.split("?");

    if (dashboards.includes(basePath)) return pathname === basePath;

    // Link with query params: match pathname + specific query param
    if (query) {
      const linkParams = new URLSearchParams(query);
      const linkType = linkParams.get("type");
      return pathname === basePath && currentType === linkType;
    }

    // Link without query params that has children with query params (e.g. /contacts "Tous les contacts")
    // Only active when pathname matches AND no type filter is active
    const hasChildrenWithQuery = adminNavGroups
      .flatMap((g) => g.items)
      .some((item) => item.children?.some((c) => c.href === href && item.children?.some((c2) => c2.href.includes("?"))));
    if (hasChildrenWithQuery) {
      return pathname === basePath && !currentType;
    }

    return pathname === basePath || pathname.startsWith(basePath + "/");
  };

  const handleLinkClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    handleNavClick();
    router.push(href);
  };

  const renderNavLink = ({ href, label, icon: Icon }: NavItem, isChild = false) => {
    const isActive = isLinkActive(href);
    return (
      <a
        key={href + label}
        href={href}
        onClick={(e) => handleLinkClick(href, e)}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 transition-colors cursor-pointer",
          isChild ? "py-1.5 text-[13px]" : "py-2 text-sm",
          "font-medium",
          isActive
            ? "bg-red-100 dark:bg-red-700/20 text-red-400"
            : isChild
              ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
        )}
      >
        <Icon className={cn(
          isChild ? "h-3.5 w-3.5" : "h-4 w-4",
          isActive ? "text-red-400" : isChild ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"
        )} />
        {label}
      </a>
    );
  };

  const renderNavItemWithSub = (item: NavItemWithSub) => {
    if (!item.children) return renderNavLink(item);

    const isOpen = expanded[item.label] ?? false;
    const isParentActive = item.children.some((c) => isLinkActive(c.href));
    const Icon = item.icon;

    return (
      <div key={item.label}>
        <button
          onClick={() => toggleExpand(item.label)}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full",
            isParentActive
              ? "text-red-400"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <Icon className={cn("h-4 w-4", isParentActive ? "text-red-400" : "text-gray-500 dark:text-gray-400")} />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
        {isOpen && (
          <div className="ml-4 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 mt-0.5">
            {item.children.map((child) => renderNavLink(child, true))}
          </div>
        )}
      </div>
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
            <span className="block text-[9px] text-gray-600 dark:text-gray-400 leading-tight">Securite - Incendie</span>
            <span className="block text-[9px] text-gray-600 dark:text-gray-400 leading-tight">Prevention</span>
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
                  {group.items.map(renderNavItemWithSub)}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-1">
            {(flatItems ?? []).map((item) => renderNavLink(item))}
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
          Deconnexion
        </button>
      </div>
    </aside>
  );

  if (mobileOpen !== undefined) {
    return (
      <>
        <div className="hidden lg:block">{sidebarContent}</div>
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
