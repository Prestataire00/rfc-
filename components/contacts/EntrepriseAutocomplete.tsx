"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, Loader2, Search, X } from "lucide-react";

import { api } from "@/lib/fetcher";
import { Input } from "@/components/ui/input";

/**
 * Composant de recherche d'entreprise par nom ou SIRET avec auto-fill.
 *
 * Flow :
 *   1. L'utilisateur tape ≥ 2 caractères
 *   2. Debounce 300ms → appel /api/entreprises/search
 *   3. Dropdown des résultats (locaux d'abord, puis API gouv)
 *   4. Sélection → onSelect({ id, nom, siret, ... })
 *   5. Si entreprise externe (pas encore en DB), l'appelant doit appeler
 *      /api/entreprises/upsert-by-siret pour la persister
 *
 * Si l'utilisateur veut effacer sa sélection : croix → onSelect(null)
 */

export type EntrepriseSuggestion = {
  id: string | null;
  existing: boolean;
  nom: string;
  siret: string | null;
  siren: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  codeApe: string | null;
  libelleApe: string | null;
};

type Props = {
  value: EntrepriseSuggestion | null;
  onSelect: (entreprise: EntrepriseSuggestion | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function EntrepriseAutocomplete({
  value,
  onSelect,
  placeholder = "Rechercher une entreprise (nom ou SIRET)…",
  disabled = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntrepriseSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce 300ms
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<{ items: EntrepriseSuggestion[] }>(
          `/api/entreprises/search?q=${encodeURIComponent(query)}`,
        );
        setResults(res.items ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Fermer la dropdown sur clic extérieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const summary = useMemo(() => {
    if (!value) return null;
    const parts = [value.siret ? `SIRET ${value.siret}` : null, value.ville];
    return parts.filter(Boolean).join(" · ");
  }, [value]);

  if (value) {
    return (
      <div className="rounded-md border border-emerald-700/40 bg-emerald-900/10 p-3 flex items-start gap-3">
        <Building2 className="mt-0.5 h-5 w-5 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{value.nom}</p>
            {value.existing ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> Déjà en base
              </span>
            ) : (
              <span className="text-xs text-amber-400">
                Sera créée à l'enregistrement
              </span>
            )}
          </div>
          {summary ? (
            <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>
          ) : null}
          {value.adresse ? (
            <p className="text-xs text-muted-foreground">
              {value.adresse}
              {value.codePostal ? ` · ${value.codePostal}` : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-muted-foreground hover:text-red-500 shrink-0"
          aria-label="Effacer l'entreprise"
          title="Changer d'entreprise"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {results.map((r, idx) => (
            <li key={`${r.id ?? r.siret ?? idx}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/60 border-b border-border/40 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{r.nom}</p>
                  {r.existing ? (
                    <span className="text-[10px] uppercase rounded bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5">
                      en base
                    </span>
                  ) : null}
                </div>
                {(r.siret || r.ville) ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.siret ? `SIRET ${r.siret}` : ""}
                    {r.siret && r.ville ? " · " : ""}
                    {r.ville ?? ""}
                  </p>
                ) : null}
                {r.libelleApe ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {r.libelleApe}
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : open && !loading && query.length >= 2 ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover p-3 text-center text-sm text-muted-foreground shadow-lg">
          Aucune entreprise trouvée pour « {query} »
        </div>
      ) : null}
    </div>
  );
}
