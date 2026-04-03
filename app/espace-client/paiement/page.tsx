"use client";

import { useState, useEffect, useRef } from "react";
import { CreditCard, Building2, FileCheck, AlertCircle, CheckCircle, Copy, X, ExternalLink, ChevronRight } from "lucide-react";
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

type ModalContent = {
  title: string;
  icon: string;
  body: React.ReactNode;
};

const OPCOS = [
  { nom: "OPCO 2i", secteurs: "Industries chimiques, plasturgie, textile" },
  { nom: "AFDAS", secteurs: "Culture, médias, sport, loisirs" },
  { nom: "ATLAS", secteurs: "Services financiers, conseil, numérique" },
  { nom: "CONSTRUCTYS", secteurs: "Construction, BTP" },
  { nom: "EP", secteurs: "Économie de proximité (commerce, artisanat, coiffure)" },
  { nom: "OCAPIAT", secteurs: "Agriculture, pêche, agroalimentaire" },
  { nom: "OPCO Mobilités", secteurs: "Transport, logistique, automobile" },
  { nom: "OPCO Santé", secteurs: "Sanitaire, social, médico-social" },
  { nom: "Uniformation", secteurs: "Économie sociale, habitat, animation" },
  { nom: "Akto", secteurs: "Services à la personne, commerce" },
  { nom: "Opcommerce", secteurs: "Commerce non alimentaire" },
];

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-2 text-gray-400 hover:text-gray-200 transition-colors"
      title="Copier"
    >
      {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Modal({ content, onClose }: { content: ModalContent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{content.icon}</span>
            <h2 className="font-semibold text-gray-100">{content.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{content.body}</div>
      </div>
    </div>
  );
}

export default function PaiementPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalContent | null>(null);
  const ribRef = useRef<HTMLDivElement>(null);

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
  const moyens = (params?.moyensPaiement || "virement,cpf,opco").split(",").filter(Boolean);
  const totalDu = factures.reduce((sum, f) => sum + f.montantTTC, 0);
  const hasIban = params?.iban && params.iban.trim() !== "";

  const handleMoyenClick = (key: string) => {
    if (key === "cpf") {
      window.open("https://www.moncompteformation.gouv.fr", "_blank");
      return;
    }
    if (key === "virement") {
      setModal({
        title: "Virement bancaire",
        icon: "🏦",
        body: hasIban ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">Effectuez votre virement vers le compte suivant :</p>
            <div className="rounded-lg bg-gray-800 border border-gray-700 p-4 space-y-3">
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
                <div className="flex items-center gap-2">
                  <p className="font-mono font-medium text-gray-100 tracking-wider">{params?.iban}</p>
                  <CopyBtn value={params?.iban || ""} />
                </div>
              </div>
              {params?.bic && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">BIC / SWIFT</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium text-gray-100">{params.bic}</p>
                    <CopyBtn value={params.bic} />
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">Délai de réception : 1 à 2 jours ouvrés. Indiquez votre numéro de facture en référence.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">Les coordonnées bancaires ne sont pas encore disponibles en ligne.</p>
            <div className="rounded-lg border border-amber-700/40 bg-amber-900/10 p-3">
              <p className="text-sm text-amber-300 font-medium">Contactez-nous directement</p>
              <p className="text-xs text-gray-400 mt-1">Nous vous communiquerons notre RIB par email ou téléphone.</p>
            </div>
          </div>
        ),
      });
      return;
    }
    if (key === "opco") {
      setModal({
        title: "Financement OPCO",
        icon: "🏢",
        body: (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Votre entreprise peut financer la formation via son <strong className="text-white">OPCO (Opérateur de Compétences)</strong>. Nous prenons en charge le montage du dossier.
            </p>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Principaux OPCOs</p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {OPCOS.map((o) => (
                  <div key={o.nom} className="rounded-md bg-gray-800 px-3 py-2">
                    <p className="text-sm font-medium text-gray-100">{o.nom}</p>
                    <p className="text-xs text-gray-400">{o.secteurs}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-blue-700/40 bg-blue-900/10 p-3">
              <p className="text-sm text-blue-300 font-medium mb-0.5">Contactez-nous pour monter votre dossier</p>
              <p className="text-xs text-gray-400">Nous vous accompagnons de A à Z dans la demande de prise en charge auprès de votre OPCO.</p>
            </div>
          </div>
        ),
      });
      return;
    }
    if (key === "carte") {
      setModal({
        title: "Paiement par carte",
        icon: "💳",
        body: (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">Le paiement par carte est disponible :</p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />Sur place, lors de votre passage dans nos locaux.</li>
              <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />Par lien de paiement sécurisé envoyé par email sur demande.</li>
            </ul>
            <p className="text-xs text-gray-500">Contactez-nous pour recevoir un lien de paiement.</p>
          </div>
        ),
      });
      return;
    }
    if (key === "especes") {
      setModal({
        title: "Paiement en espèces",
        icon: "💶",
        body: (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">Le règlement en espèces est accepté uniquement sur place, contre remise d&apos;un reçu officiel.</p>
            <p className="text-xs text-gray-500">Merci de prévoir le montant exact.</p>
          </div>
        ),
      });
    }
  };

  const MOYENS_CONFIG: Record<string, { label: string; icon: string; description: string; action: string }> = {
    virement: { label: "Virement bancaire", icon: "🏦", description: "Virement SEPA vers notre compte. Délai : 1-2 jours ouvrés.", action: "Voir le RIB" },
    cpf: { label: "CPF — Compte Personnel de Formation", icon: "🎓", description: "Mobilisez vos droits formation sur Mon Compte Formation.", action: "Accéder au site" },
    opco: { label: "OPCO — Financement employeur", icon: "🏢", description: "Prise en charge par votre opérateur de compétences.", action: "En savoir plus" },
    carte: { label: "Carte bancaire", icon: "💳", description: "Paiement par carte sur place ou par lien sécurisé.", action: "Plus d'infos" },
    especes: { label: "Espèces", icon: "💶", description: "Paiement en espèces sur place, avec reçu.", action: "Plus d'infos" },
  };

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
                <div key={f.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${isOverdue ? "border-red-700 bg-red-900/10" : "border-gray-700 bg-gray-800"}`}>
                  <div>
                    <p className="font-medium text-gray-100 text-sm font-mono">{f.numero}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Émise le {formatDate(f.dateEmission)} · Échéance le{" "}
                      <span className={isOverdue ? "text-red-400 font-medium" : ""}>{formatDate(f.dateEcheance)}{isOverdue && " (dépassée)"}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-100">{formatCurrency(f.montantTTC)}</p>
                    <a href={`/api/pdf/facture/${f.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:underline">
                      Télécharger PDF
                    </a>
                  </div>
                </div>
              );
            })}
            {factures.length > 1 && (
              <div className="flex justify-end pt-1">
                <span className="text-sm font-semibold text-gray-100">Total dû : {formatCurrency(totalDu)}</span>
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
            const m = MOYENS_CONFIG[key.trim()];
            if (!m) return null;
            const isPublicFunding = key === "cpf" || key === "opco";
            return (
              <button
                key={key}
                onClick={() => handleMoyenClick(key.trim())}
                className={`text-left rounded-lg border p-4 transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer group ${
                  isPublicFunding
                    ? "border-blue-700/50 bg-blue-900/10 hover:border-blue-600 hover:bg-blue-900/20"
                    : "border-gray-700 bg-gray-800 hover:border-gray-500 hover:bg-gray-750"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{m.icon}</span>
                    <p className="font-semibold text-gray-100 text-sm">{m.label}</p>
                  </div>
                  {key === "cpf" && <ExternalLink className="h-3.5 w-3.5 text-gray-500 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />}
                  {key !== "cpf" && <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-300 flex-shrink-0 mt-0.5 transition-colors" />}
                </div>
                <p className="text-xs text-gray-400">{m.description}</p>
                <p className={`text-xs mt-2 font-medium ${isPublicFunding ? "text-blue-400" : "text-red-400"} group-hover:underline`}>
                  {m.action} →
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Coordonnées bancaires */}
      <div ref={ribRef}>
        {hasIban ? (
          <section>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100 mb-4">
              <Building2 className="h-5 w-5 text-green-400" />
              Coordonnées bancaires (RIB)
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
        ) : (
          moyens.includes("virement") && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-center text-sm text-gray-500">
              Les coordonnées bancaires seront disponibles prochainement. Contactez-nous pour effectuer un virement.
            </div>
          )
        )}
      </div>

      {/* Conditions */}
      {params?.conditionsPaiement && (
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <FileCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p>{params.conditionsPaiement}</p>
        </div>
      )}

      {/* Modal */}
      {modal && <Modal content={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
