import { prisma } from "@/lib/prisma";
import { Receipt, Clock, CheckCircle2, XCircle, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUT_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  soumise:   { icon: Clock,         color: "text-amber-400",   bg: "bg-amber-950/40 border-amber-800",   label: "Soumise" },
  approuvee: { icon: CheckCircle2,  color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800", label: "Approuvée" },
  rejetee:   { icon: XCircle,       color: "text-red-400",     bg: "bg-red-950/40 border-red-800",       label: "Rejetée" },
  payee:     { icon: CreditCard,    color: "text-blue-400",    bg: "bg-blue-950/40 border-blue-800",     label: "Payée" },
};

const CATEGORIE_LABELS: Record<string, string> = {
  transport: "Transport",
  hebergement: "Hébergement",
  repas: "Repas",
  materiel: "Matériel",
  autre: "Autre",
};

export default async function AdminNotesFraisPage() {
  const notes = await prisma.noteFrais.findMany({
    orderBy: [{ statut: "asc" }, { date: "desc" }],
    include: { formateur: { select: { nom: true, prenom: true } } },
  });

  const totalParStatut = notes.reduce<Record<string, { count: number; montant: number }>>((acc, n) => {
    if (!acc[n.statut]) acc[n.statut] = { count: 0, montant: 0 };
    acc[n.statut].count += 1;
    acc[n.statut].montant += n.montant;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
          <Receipt className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Notes de frais</h1>
          <p className="text-sm text-gray-400">Vue agrégée des notes de frais soumises par les formateurs.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUT_STYLES).map(([statut, style]) => {
          const t = totalParStatut[statut] ?? { count: 0, montant: 0 };
          const Icon = style.icon;
          return (
            <div key={statut} className={`rounded-xl border ${style.bg} p-4`}>
              <div className={`flex items-center gap-2 ${style.color} mb-1`}>
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{style.label}</span>
              </div>
              <div className="text-xl font-bold text-gray-100">{t.count}</div>
              <div className="text-xs text-gray-400">{t.montant.toFixed(2)} € total</div>
            </div>
          );
        })}
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-gray-700 bg-gray-800/40">
          <Receipt className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucune note de frais</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-700 bg-gray-800/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/60 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Formateur</th>
                <th className="text-left px-4 py-2">Catégorie</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-right px-4 py-2">Montant HT</th>
                <th className="text-left px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {notes.map((n) => {
                const style = STATUT_STYLES[n.statut] ?? STATUT_STYLES.soumise;
                const Icon = style.icon;
                return (
                  <tr key={n.id} className="hover:bg-gray-800">
                    <td className="px-4 py-2 text-gray-300">
                      {new Date(n.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 text-gray-200">
                      {n.formateur.prenom} {n.formateur.nom}
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {CATEGORIE_LABELS[n.categorie] ?? n.categorie}
                    </td>
                    <td className="px-4 py-2 text-gray-300 max-w-xs truncate">{n.description}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-100">
                      {n.montant.toFixed(2)} €
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 text-xs ${style.color}`}>
                        <Icon className="h-3 w-3" /> {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        Stub lecture seule. Approbation / rejet / paiement à implémenter dans une PR suivante.
      </p>
    </div>
  );
}
