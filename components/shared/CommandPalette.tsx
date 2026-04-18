"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, GraduationCap, Calendar,
  FileText, ClipboardList, Settings, BarChart3, Award,
  Search, Mail, BookOpen, FolderOpen, Shield, Receipt, Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { group: "Accueil", items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ]},
  { group: "CRM", items: [
    { label: "Contacts", href: "/contacts", icon: Users },
    { label: "Entreprises", href: "/entreprises", icon: Building2 },
    { label: "Besoins", href: "/besoins", icon: ClipboardList },
  ]},
  { group: "Pedagogie", items: [
    { label: "Formations", href: "/formations", icon: BookOpen },
    { label: "Sessions", href: "/sessions", icon: Calendar },
    { label: "Formateurs", href: "/formateurs", icon: GraduationCap },
    { label: "Lieux de formation", href: "/lieux-formation", icon: Building2 },
  ]},
  { group: "Commercial", items: [
    { label: "Devis & Factures", href: "/commercial", icon: FileText },
    { label: "Campagnes", href: "/commercial/campagnes", icon: Mail },
    { label: "BPF", href: "/bpf", icon: BarChart3 },
  ]},
  { group: "Qualite", items: [
    { label: "Evaluations", href: "/evaluations", icon: ClipboardList },
    { label: "Qualiopi", href: "/qualiopi", icon: Shield },
    { label: "Documents", href: "/documents", icon: FolderOpen },
  ]},
  { group: "Admin", items: [
    { label: "Parametres", href: "/parametres", icon: Settings },
    { label: "Automations V2", href: "/parametres/automations-v2", icon: Zap },
    { label: "Utilisateurs", href: "/utilisateurs", icon: Users },
    { label: "Catalogue public", href: "/catalogue", icon: BookOpen },
  ]},
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function go(href: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
  }

  // Filtrer les items selon la query
  const filtered = NAV_ITEMS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      !query || item.label.toLowerCase().includes(query.toLowerCase()) || item.href.includes(query.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[560px] max-w-[90vw] rounded-xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une page..."
            className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder:text-gray-500"
            autoFocus
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-800 border border-gray-700 text-gray-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500">Aucun resultat</p>
          ) : (
            filtered.map((group) => (
              <div key={group.group} className="mb-2">
                <p className="text-[10px] uppercase font-semibold text-gray-500 px-2 py-1">{group.group}</p>
                {group.items.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => go(item.href)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-800 text-sm text-gray-300 transition-colors text-left"
                  >
                    <item.icon className="h-4 w-4 text-gray-500 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 text-[10px] text-gray-500">
          <span>Naviguer avec les fleches</span>
          <span><kbd className="px-1 py-0.5 rounded bg-gray-800">Cmd</kbd>+<kbd className="px-1 py-0.5 rounded bg-gray-800">K</kbd></span>
        </div>
      </div>
    </div>
  );
}
