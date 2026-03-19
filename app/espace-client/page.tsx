"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, CalendarDays, FolderOpen, FileText, CheckCircle } from "lucide-react";

export default function EspaceClientPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setStats(d); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const cards = [
    { label: "Salaries / Stagiaires", value: stats?.nbStagiaires || 0, icon: Users, color: "bg-blue-500", href: "/espace-client/stagiaires" },
    { label: "Sessions a venir", value: stats?.nbSessionsAVenir || 0, icon: CalendarDays, color: "bg-amber-500", href: "/espace-client/formations" },
    { label: "Formations terminees", value: stats?.nbSessionsTerminees || 0, icon: CheckCircle, color: "bg-green-500", href: "/espace-client/formations" },
    { label: "Documents", value: stats?.nbDocuments || 0, icon: FolderOpen, color: "bg-purple-500", href: "/espace-client/documents" },
    { label: "Devis", value: stats?.nbDevis || 0, icon: FileText, color: "bg-indigo-500", href: "/espace-client/devis" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Espace Client</h1>
        <p className="text-gray-500 mt-1">Suivez les formations de vos collaborateurs</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="block rounded-lg border bg-white p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
              </div>
              <div className={`rounded-full p-3 ${c.color}`}>
                <c.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
