"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Award, CheckCircle2, XCircle, Calendar, BookOpen, Shield } from "lucide-react";

type BadgeData = {
  badge: { nom: string; description: string | null; niveau: string; couleur: string; icone: string | null };
  contact: { prenom: string; nom: string };
  formation: { titre: string } | null;
  awardedAt: string;
  revoque: boolean;
  linkedinUrl: string;
};

const NIVEAU_LABELS: Record<string, string> = { bronze: "Bronze", argent: "Argent", or: "Or" };

export default function BadgeVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/badges/verify/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Badge introuvable");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-sm text-center">
          <XCircle className="h-14 w-14 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-100 mb-2">Badge introuvable</h1>
          <p className="text-sm text-gray-400">Ce lien de verification est invalide ou le badge a ete revoque.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
        {/* Badge icon */}
        <div
          className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4"
          style={{ backgroundColor: `${data.badge.couleur}20`, border: `3px solid ${data.badge.couleur}` }}
        >
          <span className="text-4xl">{data.badge.icone || "🏆"}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-100 mb-1">{data.badge.nom}</h1>
        <p className="text-sm font-medium mb-1" style={{ color: data.badge.couleur }}>
          Niveau {NIVEAU_LABELS[data.badge.niveau] || data.badge.niveau}
        </p>
        {data.badge.description && <p className="text-xs text-gray-400 mb-4">{data.badge.description}</p>}

        {/* Verification */}
        <div className="rounded-lg bg-emerald-900/20 border border-emerald-700 p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            {data.revoque ? (
              <XCircle className="h-5 w-5 text-red-400" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}
            <span className={`font-semibold ${data.revoque ? "text-red-400" : "text-emerald-400"}`}>
              {data.revoque ? "Badge revoque" : "Badge verifie"}
            </span>
          </div>
          <p className="text-sm text-gray-200 font-medium">
            {data.contact.prenom} {data.contact.nom}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-2 text-left text-sm mb-6">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Obtenu le {new Date(data.awardedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
          {data.formation && (
            <div className="flex items-center gap-2 text-gray-400">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span>{data.formation.titre}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-400">
            <Shield className="h-4 w-4 shrink-0" />
            <span>RFC — Rescue Formation Conseil</span>
          </div>
        </div>

        {/* LinkedIn share */}
        {!data.revoque && (
          <a
            href={data.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#0a66c2" }}
          >
            <Award className="h-4 w-4" /> Ajouter a LinkedIn
          </a>
        )}

        <p className="text-[10px] text-gray-600 mt-6">
          Verification Open Badges 2.0 — RFC Rescue Formation Conseil
        </p>
      </div>
    </div>
  );
}
