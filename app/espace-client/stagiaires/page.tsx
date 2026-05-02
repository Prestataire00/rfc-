"use client";

import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApi } from "@/hooks/useApi";

type Contact = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  poste: string | null;
  inscriptions: { session: { formation: { titre: string } }; statut: string }[];
};

export default function ClientStagiairesPage() {
  const { data, isLoading } = useApi<Contact[]>("/api/client/stagiaires");
  const contacts: Contact[] = data ?? [];
  const loading = isLoading;

  return (
    <div>
      <PageHeader title="Nos Stagiaires" description="Liste des collaborateurs inscrits en formation" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun stagiaire enregistré</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Poste</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Formations</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-100">{c.prenom} {c.nom}</td>
                  <td className="px-4 py-3 text-gray-400">{c.email}</td>
                  <td className="px-4 py-3 text-gray-400">{c.poste || "—"}</td>
                  <td className="px-4 py-3">
                    {c.inscriptions?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.inscriptions.map((insc, idx) => (
                          <span key={idx} className="inline-flex rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                            {insc.session.formation.titre}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
