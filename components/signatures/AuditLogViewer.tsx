"use client";

import useSWR from "swr";

interface Event {
  id: string;
  createdAt: string;
  type: string;
  actorType: string;
  actorId: string | null;
  eventHash: string;
}

interface AuditResponse {
  events: Event[];
  integrity: { valid: boolean; brokenAt?: string };
}

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json() as Promise<AuditResponse>;
  });

export function AuditLogViewer({ requestId }: { requestId: string }) {
  const { data, error } = useSWR(`/api/signature-requests/${requestId}/audit`, fetcher);

  if (error) return <p className="text-red-700 text-sm">Erreur chargement audit</p>;
  if (!data) return <p className="text-gray-500 text-sm">Chargement audit…</p>;

  return (
    <div>
      <p className="text-sm mb-2">
        Intégrité chaîne :{" "}
        {data.integrity.valid ? (
          <span className="text-green-700 font-medium">✓ valide</span>
        ) : (
          <span className="text-red-700 font-medium">
            ✗ corrompue (cassée à {data.integrity.brokenAt ?? "?"})
          </span>
        )}
      </p>
      <table className="w-full text-xs">
        <thead className="text-left text-gray-500 border-b">
          <tr>
            <th className="py-1 pr-2">Date</th>
            <th className="pr-2">Type</th>
            <th className="pr-2">Acteur</th>
            <th>Hash event</th>
          </tr>
        </thead>
        <tbody>
          {data.events.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="py-1 pr-2">{new Date(e.createdAt).toLocaleString("fr-FR")}</td>
              <td className="pr-2 font-mono">{e.type}</td>
              <td className="pr-2 text-gray-500">
                {e.actorType}
                {e.actorId ? `:${e.actorId.slice(0, 8)}` : ""}
              </td>
              <td className="font-mono text-gray-400">{e.eventHash.slice(0, 16)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
