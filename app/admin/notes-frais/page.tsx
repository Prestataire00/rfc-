"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Receipt, Clock, CheckCircle2, XCircle, CreditCard, MessageCircleQuestion,
} from "lucide-react";
import { notify } from "@/lib/toast";

interface NoteFrais {
  id: string;
  date: string;
  categorie: string;
  description: string;
  montant: number;
  lieu: string | null;
  statut: "soumise" | "approuvee" | "rejetee" | "payee";
  commentaireAdmin: string | null;
  justificatifUrl: string | null;
  justificatifNom: string | null;
  formateur: { nom: string; prenom: string };
}

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json() as Promise<NoteFrais[]>;
  });

const STATUT_STYLES: Record<
  string,
  { icon: React.ElementType; label: string; accentBorder: string; accentText: string }
> = {
  soumise: {
    icon: Clock,
    label: "Soumise",
    accentBorder: "border-l-amber-500",
    accentText: "text-amber-700 dark:text-amber-400",
  },
  approuvee: {
    icon: CheckCircle2,
    label: "Approuvée",
    accentBorder: "border-l-emerald-500",
    accentText: "text-emerald-700 dark:text-emerald-400",
  },
  rejetee: {
    icon: XCircle,
    label: "Rejetée",
    accentBorder: "border-l-red-500",
    accentText: "text-red-700 dark:text-red-400",
  },
  payee: {
    icon: CreditCard,
    label: "Payée",
    accentBorder: "border-l-blue-500",
    accentText: "text-blue-700 dark:text-blue-400",
  },
};

const CATEGORIE_LABELS: Record<string, string> = {
  transport: "Transport",
  hebergement: "Hébergement",
  repas: "Repas",
  materiel: "Matériel",
  autre: "Autre",
};

type Action = "approuver" | "refuser" | "details" | "payer";

interface ActionModalProps {
  note: NoteFrais;
  action: Action;
  onClose: () => void;
  onConfirm: (commentaire: string) => Promise<void>;
}

function ActionModal({ note, action, onClose, onConfirm }: ActionModalProps) {
  const [commentaire, setCommentaire] = useState(note.commentaireAdmin ?? "");
  const [saving, setSaving] = useState(false);

  const required = action === "refuser" || action === "details";
  const labels: Record<Action, { title: string; cta: string; placeholder: string; color: string }> = {
    approuver: {
      title: "Approuver la note",
      cta: "Confirmer l'approbation",
      placeholder: "Commentaire (optionnel)",
      color: "bg-emerald-600 hover:bg-emerald-700",
    },
    refuser: {
      title: "Refuser la note",
      cta: "Confirmer le refus",
      placeholder: "Motif du refus (obligatoire)",
      color: "bg-red-600 hover:bg-red-700",
    },
    details: {
      title: "Demander des détails",
      cta: "Envoyer la demande",
      placeholder: "Précisez ce qui manque (justificatif, contexte, montant)…",
      color: "bg-amber-600 hover:bg-amber-700",
    },
    payer: {
      title: "Marquer comme payée",
      cta: "Confirmer le paiement",
      placeholder: "Référence virement / commentaire (optionnel)",
      color: "bg-blue-600 hover:bg-blue-700",
    },
  };
  const cfg = labels[action];
  const canSubmit = !required || commentaire.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onConfirm(commentaire.trim());
      onClose();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-5 space-y-4 border border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{cfg.title}</h2>
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          <p>{note.formateur.prenom} {note.formateur.nom} · {CATEGORIE_LABELS[note.categorie]}</p>
          <p className="font-medium text-gray-700 dark:text-gray-300">{note.description} — {note.montant.toFixed(2)} €</p>
        </div>
        <textarea
          autoFocus
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={4}
          placeholder={cfg.placeholder}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded text-sm text-gray-900 dark:text-gray-100"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className={`px-4 py-1.5 text-white text-sm rounded disabled:opacity-50 ${cfg.color}`}
          >
            {saving ? "…" : cfg.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminNotesFraisPage() {
  const { data: notes, mutate, error, isLoading } = useSWR<NoteFrais[]>(
    "/api/notes-frais",
    fetcher,
  );
  const [modal, setModal] = useState<{ note: NoteFrais; action: Action } | null>(null);

  const submitAction = async (commentaire: string) => {
    if (!modal) return;
    const { note, action } = modal;
    const statutMap: Record<Action, NoteFrais["statut"]> = {
      approuver: "approuvee",
      refuser: "rejetee",
      details: "soumise", // reste "soumise" — on stocke juste le commentaire admin
      payer: "payee",
    };
    const res = await fetch(`/api/notes-frais/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statut: statutMap[action],
        commentaireAdmin: commentaire || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? res.statusText);
    }
    notify.success(
      action === "approuver" ? "Note approuvée"
      : action === "refuser" ? "Note refusée"
      : action === "payer" ? "Note marquée payée"
      : "Demande de détails envoyée",
    );
    mutate();
  };

  const totalParStatut = (notes ?? []).reduce<Record<string, { count: number; montant: number }>>(
    (acc, n) => {
      if (!acc[n.statut]) acc[n.statut] = { count: 0, montant: 0 };
      acc[n.statut].count += 1;
      acc[n.statut].montant += n.montant;
      return acc;
    },
    {},
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
          <Receipt className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notes de frais</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vue agrégée des notes de frais soumises par les formateurs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUT_STYLES).map(([statut, style]) => {
          const t = totalParStatut[statut] ?? { count: 0, montant: 0 };
          const Icon = style.icon;
          return (
            <div
              key={statut}
              className={`rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${style.accentBorder} bg-white dark:bg-gray-800 p-4`}
            >
              <div className={`flex items-center gap-2 ${style.accentText} mb-1`}>
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {style.label}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t.count}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.montant.toFixed(2)} € total
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && <p className="text-sm text-gray-500">Chargement…</p>}
      {error && <p className="text-sm text-red-600">Erreur de chargement</p>}

      {notes && notes.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40">
          <Receipt className="h-10 w-10 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune note de frais</p>
        </div>
      ) : notes && notes.length > 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Formateur</th>
                <th className="text-left px-4 py-2.5">Catégorie</th>
                <th className="text-left px-4 py-2.5">Description</th>
                <th className="text-right px-4 py-2.5">Montant HT</th>
                <th className="text-left px-4 py-2.5">Statut</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {notes.map((n) => {
                const style = STATUT_STYLES[n.statut] ?? STATUT_STYLES.soumise;
                const Icon = style.icon;
                const isFinal = n.statut === "payee" || n.statut === "rejetee";
                return (
                  <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                      {new Date(n.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900 dark:text-gray-200">
                      {n.formateur.prenom} {n.formateur.nom}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                      {CATEGORIE_LABELS[n.categorie] ?? n.categorie}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 max-w-xs">
                      <div className="truncate">{n.description}</div>
                      {n.commentaireAdmin && (
                        <div className="text-[10px] text-gray-500 mt-0.5 italic truncate">
                          Note admin : {n.commentaireAdmin}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                      {n.montant.toFixed(2)} €
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${style.accentText}`}>
                        <Icon className="h-3 w-3" /> {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {n.statut === "soumise" && (
                          <>
                            <button
                              onClick={() => setModal({ note: n, action: "approuver" })}
                              className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              title="Approuver"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setModal({ note: n, action: "refuser" })}
                              className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Refuser"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setModal({ note: n, action: "details" })}
                              className="p-1.5 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              title="Demander des détails"
                            >
                              <MessageCircleQuestion className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {n.statut === "approuvee" && (
                          <button
                            onClick={() => setModal({ note: n, action: "payer" })}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Marquer comme payée"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        {isFinal && <span className="text-[10px] text-gray-400">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {modal && (
        <ActionModal
          note={modal.note}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={submitAction}
        />
      )}
    </div>
  );
}
