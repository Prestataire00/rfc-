"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, CalendarDays, GraduationCap,
  TrendingUp, FileText, ClipboardList, BarChart3, Calendar, FolderOpen,
  MessageSquare, Award, Shield, X, Settings, BadgeCheck, CreditCard,
  UserPlus, MapPin, UserCheck, AlertTriangle, Zap, Mail, Receipt,
  ListChecks, Briefcase, History, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavItemWithSub = NavItem & { children?: NavItem[] };

type NavGroup = {
  key: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  items?: NavItemWithSub[];
};

// ── Admin : Accueil + 8 groupes orientés flux métier ────────────────────────
// Ordre : acquisition → catalogue → projets → commercial → finance → qualité
// → reporting → admin. Pas de sous-niveau (children) pour simplifier le scan.
const adminGroups: NavGroup[] = [
  { key: "accueil", label: "Accueil", icon: LayoutDashboard, href: "/dashboard" },

  // 1. CRM : qui (contacts + formateurs + comm directe)
  {
    key: "crm",
    label: "CRM",
    icon: Users,
    items: [
      { href: "/contacts?type=prospect", label: "Prospects", icon: UserPlus },
      { href: "/contacts?type=client", label: "Clients", icon: UserCheck },
      { href: "/formateurs", label: "Formateurs", icon: GraduationCap },
      { href: "/messagerie", label: "Messagerie", icon: MessageSquare },
    ],
  },

  // 2. Pédagogie : offre de formation
  {
    key: "pedagogie",
    label: "Pédagogie",
    icon: BookOpen,
    items: [
      { href: "/formations", label: "Catalogue formations", icon: BookOpen },
      { href: "/lieux-formation", label: "Lieux de formation", icon: MapPin },
      { href: "/sessions", label: "Sessions", icon: CalendarDays },
    ],
  },

  // 3. Projets : exécution opérationnelle
  {
    key: "projets",
    label: "Projets",
    icon: Briefcase,
    items: [
      { href: "/projets", label: "Projets", icon: Briefcase },
      { href: "/tasks", label: "Tâches", icon: ListChecks },
    ],
  },

  // 4. Commercial : cycle de vente (avant facturation)
  {
    key: "commercial",
    label: "Commercial",
    icon: TrendingUp,
    items: [
      { href: "/commercial", label: "Devis", icon: FileText },
      { href: "/besoins", label: "Demandes", icon: ClipboardList },
      { href: "/fiches-besoin", label: "Fiches besoin (Qualiopi)", icon: ClipboardList },
      { href: "/commercial/campagnes", label: "Campagnes", icon: Mail },
      { href: "/bpf", label: "BPF", icon: BarChart3 },
    ],
  },

  // 5. Finance : facturation + paiement
  {
    key: "finance",
    label: "Finance",
    icon: CreditCard,
    items: [
      { href: "/commercial", label: "Factures", icon: Receipt },
      { href: "/formateurs/factures", label: "Factures formateur", icon: Receipt },
      { href: "/admin/notes-frais", label: "Notes de frais", icon: Wallet },
      { href: "/finance/paiements", label: "Paiements", icon: CreditCard },
    ],
  },

  // 6. Qualité : conformité Qualiopi + évaluations + documents
  {
    key: "qualite",
    label: "Qualité",
    icon: Award,
    items: [
      { href: "/evaluations", label: "Questionnaires", icon: ClipboardList },
      { href: "/qualiopi/indicateurs", label: "Indicateurs Qualiopi", icon: BadgeCheck },
      { href: "/documents", label: "Documents", icon: FolderOpen },
    ],
  },

  // 7. Reporting : pilotage stratégique
  {
    key: "reporting",
    label: "Reporting",
    icon: BarChart3,
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/reporting", label: "Reporting", icon: TrendingUp },
      { href: "/admin/kpi-history", label: "Historique KPI", icon: History },
    ],
  },

  // 8. Admin : outils système
  {
    key: "admin",
    label: "Admin",
    icon: Settings,
    items: [
      { href: "/utilisateurs", label: "Utilisateurs", icon: Shield },
      { href: "/parametres", label: "Paramètres", icon: Settings },
      { href: "/parametres/automations-v2", label: "Automations", icon: Zap },
    ],
  },
];

// ── Formateur : Accueil + 5 groupes ──────────────────────────────────────────
const formateurGroups: NavGroup[] = [
  { key: "accueil", label: "Accueil", icon: LayoutDashboard, href: "/espace-formateur" },

  // Activité pédagogique (mes interventions)
  {
    key: "activite",
    label: "Activité",
    icon: Calendar,
    items: [
      { href: "/espace-formateur/planning", label: "Mon planning", icon: Calendar },
      { href: "/espace-formateur/disponibilites", label: "Disponibilités", icon: CalendarDays },
      { href: "/espace-formateur/sessions", label: "Mes sessions", icon: BookOpen },
      { href: "/espace-formateur/taches", label: "Mes tâches", icon: ListChecks },
    ],
  },

  // Qualité (retours + attestations délivrées)
  {
    key: "qualite",
    label: "Qualité",
    icon: Award,
    items: [
      { href: "/espace-formateur/feedbacks", label: "Feedbacks stagiaires", icon: MessageSquare },
      { href: "/espace-formateur/attestations", label: "Attestations", icon: Award },
    ],
  },

  // Communication
  { key: "messagerie", label: "Messagerie", icon: MessageSquare, href: "/messagerie" },

  // Ressources
  { key: "documents", label: "Documents", icon: FolderOpen, href: "/espace-formateur/documents" },

  // Finance perso
  {
    key: "finance",
    label: "Finance",
    icon: Wallet,
    items: [
      { href: "/espace-formateur/factures", label: "Mes factures", icon: Receipt },
      { href: "/espace-formateur/notes-frais", label: "Notes de frais", icon: Wallet },
    ],
  },
];

// ── Client : Accueil + 5 groupes ────────────────────────────────────────────
const clientGroups: NavGroup[] = [
  { key: "accueil", label: "Accueil", icon: LayoutDashboard, href: "/espace-client" },

  // Formation : ce que mes collaborateurs suivent
  {
    key: "formation",
    label: "Formation",
    icon: BookOpen,
    items: [
      { href: "/espace-client/formations", label: "Mes formations", icon: BookOpen },
      { href: "/espace-client/inscriptions", label: "Inscriptions", icon: UserPlus },
      { href: "/espace-client/recyclages", label: "Recyclages", icon: AlertTriangle },
    ],
  },

  // Collaborateurs formés
  { key: "stagiaires", label: "Collaborateurs", icon: Users, href: "/espace-client/stagiaires" },

  // Communication
  { key: "messagerie", label: "Messagerie", icon: MessageSquare, href: "/messagerie" },

  // Ressources
  { key: "documents", label: "Documents", icon: FolderOpen, href: "/espace-client/documents" },

  // Finance & pilotage
  {
    key: "finance",
    label: "Finance & pilotage",
    icon: CreditCard,
    items: [
      { href: "/espace-client/devis", label: "Devis", icon: FileText },
      { href: "/espace-client/paiement", label: "Paiements", icon: CreditCard },
      { href: "/espace-client/roi", label: "ROI formation", icon: TrendingUp },
      { href: "/espace-client/evaluations", label: "Évaluations", icon: Award },
    ],
  },
];

const groupsByRole: Record<string, NavGroup[]> = {
  admin: adminGroups,
  formateur: formateurGroups,
  client: clientGroups,
};

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  formateur: "Formateur",
  client: "Client",
};

const DASHBOARDS = new Set(["/dashboard", "/espace-formateur", "/espace-client"]);

export function Sidebar({
  role,
  userName,
  mobileOpen,
  onClose,
}: {
  role: string;
  userName: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hovered, setHovered] = useState<string | null>(null);
  const lastFlyoutKey = useRef<string | null>(null);

  const groups = groupsByRole[role] || adminGroups;
  const currentType = searchParams.get("type") ?? "";

  // ── isLinkActive — gère les dashboards (match exact) et les query params ──
  const isLinkActive = (href: string): boolean => {
    const [basePath, query] = href.split("?");
    if (!basePath) return false;
    if (DASHBOARDS.has(basePath)) return pathname === basePath;

    if (query) {
      const linkType = new URLSearchParams(query).get("type");
      return pathname === basePath && currentType === linkType;
    }

    // Si l'item a des children avec query params, il n'est actif que si AUCUN type n'est filtré
    const allItems = groups.flatMap((g) => g.items ?? []);
    const hasQueryChildren = allItems.some(
      (i) => i.children?.some((c) => c.href === href) && i.children?.some((c) => c.href.includes("?")),
    );
    if (hasQueryChildren) return pathname === basePath && !currentType;

    return pathname === basePath || pathname.startsWith(basePath + "/");
  };

  // Groupe actif = celui dont une de ses entrées (ou children) match
  const activeGroupKey =
    groups.find((g) => {
      if (g.href) return isLinkActive(g.href);
      return g.items?.some(
        (i) => isLinkActive(i.href) || i.children?.some((c) => isLinkActive(c.href)),
      );
    })?.key ?? null;

  // Memo du dernier flyout pour éviter le flicker pendant l'animation de fermeture
  if (hovered) {
    const g = groups.find((x) => x.key === hovered);
    if (g?.items?.length) lastFlyoutKey.current = hovered;
  }
  if (lastFlyoutKey.current === null) {
    const first = groups.find((g) => g.items?.length);
    if (first) lastFlyoutKey.current = first.key;
  }

  const flyoutGroup = groups.find((g) => g.key === lastFlyoutKey.current);
  const hoveredGroup = hovered ? groups.find((g) => g.key === hovered) : null;
  const showFlyout = !!(hoveredGroup && (hoveredGroup.items?.length ?? 0) > 0);

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleNav = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    setHovered(null);
    if (onClose) onClose();
    router.push(href);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Mobile drawer (groupes empilés)
  // ──────────────────────────────────────────────────────────────────────────
  if (mobileOpen !== undefined) {
    return (
      <>
        <div className="hidden lg:block">
          <DesktopRail
            groups={groups}
            isLinkActive={isLinkActive}
            activeGroupKey={activeGroupKey}
            hovered={hovered}
            setHovered={setHovered}
            showFlyout={showFlyout}
            flyoutGroup={flyoutGroup}
            handleNav={handleNav}
            userName={userName}
            userInitials={userInitials}
            role={role}
          />
        </div>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="fixed inset-y-0 left-0 z-50 w-72 animate-in slide-in-from-left duration-200">
              <MobileDrawer
                groups={groups}
                isLinkActive={isLinkActive}
                handleNav={handleNav}
                onClose={onClose}
                userName={userName}
                userInitials={userInitials}
                role={role}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <DesktopRail
      groups={groups}
      isLinkActive={isLinkActive}
      activeGroupKey={activeGroupKey}
      hovered={hovered}
      setHovered={setHovered}
      showFlyout={showFlyout}
      flyoutGroup={flyoutGroup}
      handleNav={handleNav}
      userName={userName}
      userInitials={userInitials}
      role={role}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DesktopRail — icon-bar 64px + flyout 264px au hover
// ──────────────────────────────────────────────────────────────────────────────
function DesktopRail({
  groups,
  isLinkActive,
  activeGroupKey,
  hovered,
  setHovered,
  showFlyout,
  flyoutGroup,
  handleNav,
  userName,
  userInitials,
  role,
}: {
  groups: NavGroup[];
  isLinkActive: (href: string) => boolean;
  activeGroupKey: string | null;
  hovered: string | null;
  setHovered: (k: string | null) => void;
  showFlyout: boolean;
  flyoutGroup: NavGroup | undefined;
  handleNav: (href: string, e: React.MouseEvent) => void;
  userName: string;
  userInitials: string;
  role: string;
}) {
  return (
    <div
      className="fixed left-0 top-0 h-screen z-40 flex"
      onMouseLeave={() => setHovered(null)}
    >
      {/* Icon-bar */}
      <nav className="w-16 flex flex-col items-center border-r border-red-200/60 dark:border-gray-800 bg-gradient-to-b from-red-50 via-red-100 to-red-200 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        {/* Logo */}
        <Link href="/dashboard" className="mt-4 mb-3 shrink-0" aria-label="Accueil">
          <Image
            src="/logorescue.png"
            alt="RFC"
            width={40}
            height={40}
            className="rounded-lg drop-shadow-sm"
          />
        </Link>

        <div className="w-8 h-px bg-red-200/80 dark:bg-gray-800 mb-2" />

        {/* Groupes */}
        <div className="flex-1 flex flex-col gap-1 w-full px-2 overflow-y-auto scrollbar-thin">
          {groups.map((g) => {
            const Icon = g.icon;
            const active = activeGroupKey === g.key;
            const isHover = hovered === g.key;

            const inner = (
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 rounded-xl cursor-pointer transition-all duration-150",
                  active
                    ? "bg-red-600 text-white shadow-sm"
                    : isHover
                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-red-100/70 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300",
                )}
                onMouseEnter={() => setHovered(g.key)}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">{g.label}</span>
              </div>
            );

            if (g.href) {
              return (
                <Link
                  key={g.key}
                  href={g.href}
                  onClick={() => setHovered(null)}
                >
                  {inner}
                </Link>
              );
            }
            return <div key={g.key}>{inner}</div>;
          })}
        </div>

        {/* Footer icon-bar : avatar uniquement — la déconnexion est dans le header */}
        <div className="w-full px-2 pb-3 flex flex-col items-center gap-2">
          <div
            className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold text-[12px] flex items-center justify-center shadow-sm ring-2 ring-white/60 dark:ring-gray-900"
            title={userName}
          >
            {userInitials}
          </div>
        </div>
      </nav>

      {/* Flyout panel */}
      <div
        className={cn(
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-[width,opacity,box-shadow] duration-200 ease-out overflow-hidden",
          showFlyout ? "w-64 opacity-100 shadow-xl" : "w-0 opacity-0 shadow-none",
        )}
      >
        <div className="w-64 flex flex-col h-screen">
          {/* Header */}
          <div className="px-4 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-[10px] tracking-wider uppercase text-gray-400 dark:text-gray-500 font-medium mb-0.5">
              Section
            </p>
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              {flyoutGroup?.label}
            </h3>
          </div>

          {/* Sous-items */}
          <ul className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
            {flyoutGroup?.items?.map((item) => {
              const Icon = item.icon;
              const itemActive = isLinkActive(item.href);
              return (
                <li key={item.href + item.label}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNav(item.href, e)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition whitespace-nowrap",
                      itemActive
                        ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-medium"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                    )}
                  >
                    <span
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition",
                        itemActive
                          ? "bg-red-600 text-white shadow-sm"
                          : "bg-red-100/70 dark:bg-red-950/50 text-red-600 dark:text-red-400 group-hover:scale-105",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                  </a>

                  {/* Children indentés */}
                  {item.children && (
                    <ul className="ml-7 pl-3 border-l border-gray-200 dark:border-gray-800 space-y-0.5 mt-0.5 mb-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isLinkActive(child.href);
                        return (
                          <li key={child.href + child.label}>
                            <a
                              href={child.href}
                              onClick={(e) => handleNav(child.href, e)}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition whitespace-nowrap",
                                childActive
                                  ? "text-red-700 dark:text-red-300 font-medium"
                                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800",
                              )}
                            >
                              <ChildIcon className="w-3 h-3 shrink-0" />
                              <span className="truncate">{child.label}</span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Footer flyout — profil */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold text-[11px] flex items-center justify-center shadow-sm">
              {userInitials}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-gray-900 dark:text-white truncate">{userName}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize truncate">{roleLabels[role]}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MobileDrawer — overlay drawer avec groupes empilés
// ──────────────────────────────────────────────────────────────────────────────
function MobileDrawer({
  groups,
  isLinkActive,
  handleNav,
  onClose,
  userName,
  userInitials,
  role,
}: {
  groups: NavGroup[];
  isLinkActive: (href: string) => boolean;
  handleNav: (href: string, e: React.MouseEvent) => void;
  onClose?: () => void;
  userName: string;
  userInitials: string;
  role: string;
}) {
  return (
    <aside className="flex flex-col bg-white dark:bg-gray-900 h-full w-72">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex items-center gap-2">
          <Image src="/logorescue.png" alt="RFC" width={40} height={40} className="rounded-lg" />
          <div>
            <span className="font-bold text-black dark:text-white text-sm">RFC</span>
            <span className="block text-[9px] text-gray-600 dark:text-gray-400 leading-tight">Sécurité - Incendie</span>
            <span className="block text-[9px] text-gray-600 dark:text-gray-400 leading-tight">Prévention</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-3">
        {groups.map((g) => {
          if (g.href && !g.items?.length) {
            const Icon = g.icon;
            const active = isLinkActive(g.href);
            return (
              <a
                key={g.key}
                href={g.href}
                onClick={(e) => handleNav(g.href!, e)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    active ? "bg-red-600 text-white" : "bg-red-100/70 dark:bg-red-950/50 text-red-600 dark:text-red-400",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                {g.label}
              </a>
            );
          }
          return (
            <div key={g.key}>
              <p className="px-3 mb-1 text-[10px] tracking-wider uppercase text-gray-400 dark:text-gray-500 font-medium">
                {g.label}
              </p>
              <ul className="space-y-0.5">
                {g.items?.map((item) => {
                  const Icon = item.icon;
                  const active = isLinkActive(item.href);
                  return (
                    <li key={item.href + item.label}>
                      <a
                        href={item.href}
                        onClick={(e) => handleNav(item.href, e)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-medium"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                        )}
                      >
                        <span
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            active ? "bg-red-600 text-white" : "bg-red-100/70 dark:bg-red-950/50 text-red-600 dark:text-red-400",
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        {item.label}
                      </a>
                      {item.children && (
                        <ul className="ml-7 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-0.5 mt-0.5 mb-1">
                          {item.children.map((c) => {
                            const ChildIcon = c.icon;
                            const ca = isLinkActive(c.href);
                            return (
                              <li key={c.href + c.label}>
                                <a
                                  href={c.href}
                                  onClick={(e) => handleNav(c.href, e)}
                                  className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors",
                                    ca
                                      ? "text-red-700 dark:text-red-300 font-medium"
                                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800",
                                  )}
                                >
                                  <ChildIcon className="w-3 h-3 shrink-0" />
                                  <span>{c.label}</span>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer profil + logout */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
        <div className="flex items-center gap-2 px-2">
          <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold text-xs flex items-center justify-center">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabels[role]}</p>
          </div>
        </div>
        {/* Bouton de déconnexion retiré : disponible dans le header en haut à droite */}
      </div>
    </aside>
  );
}
