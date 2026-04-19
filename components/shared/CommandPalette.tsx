"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, GraduationCap, Calendar,
  FileText, ClipboardList, Settings, BarChart3, Award,
  Search, Mail, BookOpen, FolderOpen, Shield, Receipt, Zap, User, Briefcase,
} from "lucide-react";

type SearchResult = { type: string; id: string; title: string; subtitle: string; href: string };

const NAV_ITEMS = [
  { group: "Accueil", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  { group: "CRM", items: [{ label: "Contacts", href: "/contacts", icon: Users }, { label: "Entreprises", href: "/entreprises", icon: Building2 }, { label: "Besoins", href: "/besoins", icon: ClipboardList }] },
  { group: "Pedagogie", items: [{ label: "Formations", href: "/formations", icon: BookOpen }, { label: "Sessions", href: "/sessions", icon: Calendar }, { label: "Formateurs", href: "/formateurs", icon: GraduationCap }] },
  { group: "Commercial", items: [{ label: "Devis & Factures", href: "/commercial", icon: FileText }, { label: "Campagnes", href: "/commercial/campagnes", icon: Mail }] },
  { group: "Qualite", items: [{ label: "Questionnaires", href: "/evaluations", icon: ClipboardList }, { label: "Qualiopi", href: "/qualiopi", icon: Shield }, { label: "Documents", href: "/documents", icon: FolderOpen }] },
  { group: "Admin", items: [{ label: "Parametres", href: "/parametres", icon: Settings }, { label: "Automations V2", href: "/parametres/automations-v2", icon: Zap }] },
];

const TYPE_ICONS: Record<string, React.ElementType> = { contact: User, entreprise: Building2, session: Calendar, devis: FileText, facture: Receipt, besoin: ClipboardList };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => { setSelectedIndex(0); }, [query, results]);

  function go(href: string) { router.push(href); setOpen(false); setQuery(""); }

  // Flatten all items for keyboard navigation
  const allItems = query.trim().length >= 2
    ? results.map((r) => ({ label: r.title, href: r.href, subtitle: r.subtitle, type: r.type }))
    : NAV_ITEMS.flatMap((g) => g.items.filter((i) => !query || i.label.toLowerCase().includes(query.toLowerCase())).map((i) => ({ label: i.label, href: i.href, subtitle: "", type: "nav" })));

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && allItems[selectedIndex]) { e.preventDefault(); go(allItems[selectedIndex].href); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[18vh]" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-[560px] max-w-[90vw] rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Rechercher un contact, une session, un devis..." className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400" autoFocus />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400">ESC</kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          {allItems.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500">{searching ? "Recherche..." : "Aucun resultat"}</p>
          ) : (
            allItems.map((item, i) => {
              const Icon = TYPE_ICONS[item.type] || Search;
              return (
                <button key={`${item.type}-${item.href}-${i}`} onClick={() => go(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${i === selectedIndex ? "bg-red-50 dark:bg-gray-800 text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                  <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.label}</p>
                    {item.subtitle && <p className="text-[11px] text-gray-400 truncate">{item.subtitle}</p>}
                  </div>
                  {item.type !== "nav" && <span className="text-[9px] uppercase text-gray-400 font-semibold shrink-0">{item.type}</span>}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400">
          <span>Fleches pour naviguer, Entree pour ouvrir</span>
          <span><kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800">Cmd</kbd>+<kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800">K</kbd></span>
        </div>
      </div>
    </div>
  );
}
