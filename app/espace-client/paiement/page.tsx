"use client";

import { useState, useEffect } from "react";
import { CreditCard, Building2, FileCheck, AlertCircle, CheckCircle, Copy } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate, formatCurrency } from "@/lib/utils";

type Facture = {
  id: string;
  numero: string;
  statut: string;
  montantTTC: number;
  dateEcheance: string;
  dateEmission: string;
};

type Parametres = {
  nomEntreprise: string;
  iban: string;
  bic: string;
  banque: string;
  moyensPaiement: string;
  conditionsPaiement: string;
};

type Data = {
  factures: Facture[];
  parametres: Parametres | null;
};

const MOYENS: Record<string, { label: string; icon: string; description: string; details?: string }> = {
  virement: {
    label: "Virement bancaire",
    icon: "🏦",
    description: "Virement SEPA vers notre compte bancaire. Délai : 1 à 2 jours ouvrés.",
  },
  cheque: {
    label: "Chèque",
    icon: "📝",
    description: "Chèque à l'ordre de RFC - Rescue Formation Conseil. À envoyer par courrier.",
  },
  carte: {
    label: "Carte bancaire",
    icon: "💳",
    description: "Paiement par carte sur place ou par lien sécurisé.",
  },
  especes: {
    label: "Espèces",
    icon: "💶",
    description: "Paiement en espèces sur place, avec remise d'un reçu.",
  },
  cpf: {
    label: "CPF — Compte Personnel de Formation",
    icon: "🎓",
    description: "Financement via votre Compte Personnel de Formation. Connectez-vous sur Mon Compte Formation pour mobiliser vos droits.",
    details: "moncompteformation.gouv.fr",
  },
  opco: {
    label: "OPCO — Financement employeur",
    icon: "🏢",
    description: "Prise en charge par votre OPCO (Opérateur de Compétences). Nous vous accompagnons dans la constitution du dossier de prise en charge.",
    details: "Contactez-nous pour monter le dossier.",
  },
};

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-2 text-gray-400 hover:text-gray-200 transition-colors" title="Copier">
      {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function PaiementPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/paiement")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  const factures = data?.factures || [];
  const params = data?.parametres;
  const moyens = (params?.moyensPaiement || "virement,cheque").split(",").filter(Boolean);
  const totalDu = factures.reduce((sum, f) => sum + f.montantTTC, 0);
  const hasIban = params?.iban && params.iban.trim() !== "";

  return (
    <div className="space-y-8">
      <PageHeader title="Paiement" description="Moyens de paiement et factures en attente" />

      {/* Factures en attente */}
      <section>
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100 mb-4">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          Factures en attente de paiement
        </h2>
        {factures.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <p className="text-gray-300 font-medium">Aucune facture en attente</p>
            <p className="text-gray-500 text-sm mt-1">Toutes vos factures sont à jour.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {factures.map((f) => {
              const isOverdue = new Date(f.dateEcheance) < new Date();
              return (
                <div
                  key={f.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    isOverdue ? "border-red-700 bg-red-900/10" : "border-gray-700 bg-gray-800"
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-100 text-sm font-mono">{f.numero}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Émise le {formatDate(f.dateEmission)} · Échéance le{" "}
                      <span className={isOverdue ? "text-red-400 font-medium" : ""}>
                        {formatDate(f.dateEcheance)}
                        {isOverdue && " (dépassée)"}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-100">{formatCurrency(f.montantTTC)}</p>
                    <a
                      href={`/api/pdf/facture/${f.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-400 hover:underline"
                    >
                      Télécharger PDF
                    </a>
                  </div>
                </div>
              );
            })}
            {factures.length > 1 && (
              <div className="flex justify-end pt-1">
                <span className="text-sm font-semibold text-gray-100">
                  Total dû : {formatCurrency(totalDu)}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Moyens de paiement */}
      <section>
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100 mb-4">
          <CreditCard className="h-5 w-5 text-blue-400" />
          Moyens de paiement acceptés
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {moyens.map((key) => {
            const m = MOYENS[key.trim()];
            if (!m) return null;
            const isPublicFunding = key === "cpf" || key === "opco";
            return (
              <div
                key={key}
                className={`rounded-lg border p-4 ${
                  isPublicFunding
                    ? "border-blue-700/50 bg-blue-900/10"
                    : "border-gray-700 bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{m.icon}</span>
                  <p className="font-semibold text-gray-100 text-sm">{m.label}</p>
                </div>
                <p className="text-xs text-gray-400">{m.description}</p>
                {m.details && (
                  <p className="text-xs text-blue-400 mt-1.5 font-medium">{m.details}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Coordonnées bancaires */}
      {hasIban && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100 mb-4">
            <Building2 className="h-5 w-5 text-green-400" />
            Coordonnées bancaires
          </h2>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Bénéficiaire</p>
              <p className="font-medium text-gray-100">{params?.nomEntreprise}</p>
            </div>
            {params?.banque && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Banque</p>
                <p className="font-medium text-gray-100">{params.banque}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">IBAN</p>
              <div className="flex items-center">
                <p className="font-mono font-medium text-gray-100 tracking-wider">{params?.iban}</p>
                <CopyBtn value={params?.iban || ""} />
              </div>
            </div>
            {params?.bic && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">BIC / SWIFT</p>
                <div className="flex items-center">
                  <p className="font-mono font-medium text-gray-100">{params.bic}</p>
                  <CopyBtn value={params.bic} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Conditions */}
      {params?.conditionsPaiement && (
        <section>
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <FileCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <p>{params.conditionsPaiement}</p>
          </div>
        </section>
      )}
    </div>
  );
}
