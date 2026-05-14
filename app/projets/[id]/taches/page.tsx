"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, ListChecks } from "lucide-react";
import { ProjetTachesPanel } from "@/components/projets/ProjetTachesPanel";

const fetcher = (u: string) => fetch(u).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
});

export default function ProjetTachesPage() {
  const { id } = useParams<{ id: string }>();
  // Lecture minimale juste pour le titre — le panel charge lui-même les
  // données complètes via le même endpoint (SWR dédupe).
  const { data } = useSWR<{ projet: { nom: string } }>(
    `/api/projets/${id}/taches`,
    fetcher,
  );

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Link href={`/projets/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-400 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour au projet
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">{data?.projet.nom ?? "Projet"}</h1>
        <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Tâches du projet
        </p>
      </div>

      <ProjetTachesPanel projetId={id} />
    </div>
  );
}
