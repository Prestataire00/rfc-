import { prisma } from "@/lib/prisma";

export type EntrepriseParams = {
  nomEntreprise: string;
  slogan: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  siteWeb: string;
  siret: string;
  nda: string;
  tvaIntracom: string;
  conditionsPaiement: string;
  mentionsDevis: string;
  mentionsFacture: string;
  iban: string;
  bic: string;
  banque: string;
  moyensPaiement: string;
  logoUrl: string | null;
  couleurPrimaire: string;
  featureFlags: Record<string, boolean>;
};

const DEFAULTS: EntrepriseParams = {
  nomEntreprise: "RFC - Rescue Formation Conseil",
  slogan: "Sécurité - Incendie - Prévention",
  adresse: "",
  codePostal: "",
  ville: "",
  telephone: "",
  email: "",
  siteWeb: "www.rescueformation83.fr",
  siret: "",
  nda: "",
  tvaIntracom: "",
  conditionsPaiement: "Paiement à 30 jours à compter de la date de facturation.",
  mentionsDevis: "Devis valable 30 jours.",
  mentionsFacture: "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.",
  iban: "",
  bic: "",
  banque: "",
  moyensPaiement: "virement,cpf,opco",
  logoUrl: null,
  couleurPrimaire: "#dc2626",
  featureFlags: {},
};

export async function getParametres(): Promise<EntrepriseParams> {
  try {
    const params = await prisma.parametres.findUnique({ where: { id: "default" } });
    if (!params) return DEFAULTS;
    // Parse featureFlags from JSON string to object
    let featureFlags: Record<string, boolean> = {};
    try {
      if (typeof params.featureFlags === "string") {
        featureFlags = JSON.parse(params.featureFlags);
      }
    } catch { /* keep empty */ }
    return { ...DEFAULTS, ...params, featureFlags };
  } catch {
    return DEFAULTS;
  }
}
