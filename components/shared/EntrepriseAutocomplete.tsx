"use client";

/**
 * EntrepriseAutocomplete — composant partagé pour la recherche d'entreprise via
 * l'API gouvernementale `recherche-entreprises.api.gouv.fr`.
 *
 * Encapsule entièrement le pattern : state interne (query, results, loading,
 * dropdown open), debounce 300ms, fetch, dropdown de résultats, fermeture au
 * clic extérieur. Compatible light + dark mode.
 *
 * Le parent reçoit l'entreprise sélectionnée via le callback `onSelect`.
 */

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Type public exporté (cf. forme renvoyée par l'API gouv)
// ---------------------------------------------------------------------------

export type EntrepriseGouv = {
  siren: string;
  nom_raison_sociale: string;
  siege: {
    siret: string;
    adresse: string;
    code_postal: string;
    libelle_commune: string;
    activite_principale: string;
  };
  tranche_effectif_salarie?: string;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  onSelect: (entreprise: EntrepriseGouv) => void;
  placeholder?: string;
  className?: string;
};

// ---------------------------------------------------------------------------
// Hook debounce local (interne, pas exporté)
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Fetch API gouv
// ---------------------------------------------------------------------------

async function searchEntrepriseGouv(query: string): Promise<EntrepriseGouv[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query.trim())}&page=1&per_page=8`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export function EntrepriseAutocomplete({
  onSelect,
  placeholder = "Ex : Bouygues, 12345678901234...",
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntrepriseGouv[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Recherche debouncée
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    searchEntrepriseGouv(debouncedQuery).then((items) => {
      setResults(items);
      setOpen(items.length > 0);
      setLoading(false);
    });
  }, [debouncedQuery]);

  // Click outside → close dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(ent: EntrepriseGouv) {
    onSelect(ent);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) setOpen(false);
          }}
          placeholder={placeholder}
          className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pl-9 pr-8 text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {loading && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Recherche en cours...</p>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((ent) => (
            <li key={ent.siren}>
              <button
                type="button"
                onClick={() => handleSelect(ent)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {ent.nom_raison_sociale}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                  {ent.siege?.siret && `SIRET: ${ent.siege.siret}`}
                  {ent.siege?.libelle_commune && ` — ${ent.siege.libelle_commune}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
