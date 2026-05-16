import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks
vi.mock("@/lib/prisma", () => ({
  prisma: {
    demande: { findUnique: vi.fn(), update: vi.fn() },
    formation: { findMany: vi.fn(), findUnique: vi.fn() },
    devis: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/ai", () => ({
  askClaude: vi.fn(),
  checkAIKey: vi.fn(() => true),
}));
vi.mock("@/lib/notifications", () => ({
  notifyAdmins: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/historique", () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

const importGenerate = async () =>
  (await import("@/lib/ai/generate-devis-from-demande")).generateDevisFromDemandeWithAI;
const importMocks = async () => ({
  prisma: (await import("@/lib/prisma")).prisma as any,
  ai: await import("@/lib/ai") as any,
});

const sampleDemande = {
  id: "cuid_demande_1",
  titre: "Formation SST",
  description: "Recyclage SST",
  notes: null,
  nbStagiaires: 5,
  budget: 2000,
  sourceContact: "email",
  entrepriseId: "cuid_ent_1",
  contactId: "cuid_contact_1",
  devisId: null,
  entreprise: { id: "cuid_ent_1", nom: "Acme", secteur: "industrie", effectif: 50, typeEntreprise: "PME" },
  contact: { id: "cuid_contact_1", nom: "Dupont", prenom: "Jean", poste: "RH" },
};
const sampleFormations = [
  { id: "cuid_form_sst", titre: "SST initial", description: "Sauveteur Secouriste Travail", duree: 14, tarif: 350, categorie: "secours", certifiante: true, actif: true },
];

const validAiOutput = JSON.stringify({
  formationId: "cuid_form_sst",
  objet: "Formation SST initiale 14h - 5 stagiaires",
  lignes: [{ designation: "Formation SST 14h", quantite: 5, prixUnitaire: 350 }],
  rationale: "Match parfait",
});

describe("generateDevisFromDemandeWithAI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crée un devis brouillon quand l'IA retourne un JSON valide", async () => {
    const { prisma, ai } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce(sampleDemande);
    prisma.formation.findMany.mockResolvedValueOnce(sampleFormations);
    prisma.formation.findUnique.mockResolvedValueOnce(sampleFormations[0]);
    prisma.devis.findMany.mockResolvedValueOnce([]);
    ai.askClaude.mockResolvedValueOnce(validAiOutput);
    prisma.$transaction.mockImplementationOnce(async (fn: any) => fn({
      devis: { create: vi.fn().mockResolvedValueOnce({ id: "cuid_devis_new" }) },
      demande: { update: vi.fn().mockResolvedValueOnce({}) },
    }));

    const generate = await importGenerate();
    const result = await generate("cuid_demande_1");
    expect(result).toEqual({ devisId: "cuid_devis_new" });
  });

  it("retourne error si Demande introuvable", async () => {
    const { prisma } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce(null);
    const generate = await importGenerate();
    const result = await generate("cuid_inexistant");
    expect("error" in result).toBe(true);
  });

  it("retourne error si Demande déjà liée à un devis", async () => {
    const { prisma } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce({ ...sampleDemande, devisId: "existing_devis" });
    const generate = await importGenerate();
    const result = await generate("cuid_demande_1");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("déjà");
  });

  it("retourne error si AI retourne JSON malformé", async () => {
    const { prisma, ai } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce(sampleDemande);
    prisma.formation.findMany.mockResolvedValueOnce(sampleFormations);
    ai.askClaude.mockResolvedValueOnce("Pas du JSON {{{ invalid");
    const generate = await importGenerate();
    const result = await generate("cuid_demande_1");
    expect("error" in result).toBe(true);
  });

  it("retourne error si AI retourne un formationId inexistant en base", async () => {
    const { prisma, ai } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce(sampleDemande);
    prisma.formation.findMany.mockResolvedValueOnce(sampleFormations);
    prisma.formation.findUnique.mockResolvedValueOnce(null); // formation introuvable
    ai.askClaude.mockResolvedValueOnce(validAiOutput);
    const generate = await importGenerate();
    const result = await generate("cuid_demande_1");
    expect("error" in result).toBe(true);
  });
});
