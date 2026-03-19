"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/stagiaires")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setContacts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Nos Stagiaires" description="Liste des collaborateurs inscrits en formation" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun stagiaire enregistré</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Poste</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Formations</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.prenom} {c.nom}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-gray-600">{c.poste || "—"}</td>
                  <td className="px-4 py-3">
                    {c.inscriptions?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.inscriptions.map((insc, idx) => (
                          <span key={idx} className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
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
