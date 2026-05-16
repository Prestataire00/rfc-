import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    devis: { findUnique: vi.fn() },
    demande: { findFirst: vi.fn(), findUnique: vi.fn() },
    session: { findFirst: vi.fn(), create: vi.fn() },
    inscription: { findUnique: vi.fn() },
    fichePreFormationEntreprise: { findFirst: vi.fn(), create: vi.fn() },
    fichePreFormationStagiaire: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// fichePreFormationEntrepriseEmail / fichePreFormationStagiaireEmail renvoient un objet
// { subject, html } (non-async). sendEmail est l'expéditeur réel.
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ skipped: false }),
  fichePreFormationEntrepriseEmail: vi.fn().mockReturnValue({ subject: "Fiche entreprise", html: "<p>test</p>" }),
  fichePreFormationStagiaireEmail: vi.fn().mockReturnValue({ subject: "Fiche stagiaire", html: "<p>test</p>" }),
}));

vi.mock("@/lib/notifications", () => ({
  notifyAdmins: vi.fn().mockResolvedValue(undefined),
}));

const importModule = async () => await import("@/lib/automations/auto-fiches-pre-formation");
const importMocks = async () => ({
  prisma: (await import("@/lib/prisma")).prisma as any,
  email: (await import("@/lib/email")) as any,
  notif: (await import("@/lib/notifications")) as any,
});

describe("autoCreateSessionAndFicheEntrepriseOnDevisSigned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skipped si Devis introuvable", async () => {
    const { prisma } = await importMocks();
    prisma.devis.findUnique.mockResolvedValueOnce(null);
    const { autoCreateSessionAndFicheEntrepriseOnDevisSigned } = await importModule();
    const res = await autoCreateSessionAndFicheEntrepriseOnDevisSigned("cuid_inexistant");
    expect("error" in res).toBe(true);
  });

  it("skipped (notif) si Demande sans formationId", async () => {
    const { prisma, notif } = await importMocks();
    prisma.devis.findUnique.mockResolvedValueOnce({
      id: "d1", numero: "DEV-001", entrepriseId: "e1", contactId: "c1",
      entreprise: { nom: "Acme" },
      contact: { email: "j@acme.com", nom: "Dupont", prenom: "Jean" },
      formation: null,
    });
    prisma.demande.findFirst.mockResolvedValueOnce({
      id: "dem1", formationId: null, nbStagiaires: 5,
    });
    const { autoCreateSessionAndFicheEntrepriseOnDevisSigned } = await importModule();
    const res = await autoCreateSessionAndFicheEntrepriseOnDevisSigned("d1");
    expect("skipped" in res || ("error" in res && (res as any).error.includes("formation"))).toBe(true);
    expect(notif.notifyAdmins).toHaveBeenCalled();
  });

  it("idempotent : skipped si session auto déjà existante pour ce devis", async () => {
    const { prisma } = await importMocks();
    prisma.devis.findUnique.mockResolvedValueOnce({
      id: "d1", numero: "DEV-001", entrepriseId: "e1", contactId: "c1",
      entreprise: { nom: "Acme" },
      contact: { email: "j@acme.com", nom: "Dupont", prenom: "Jean" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce({
      id: "dem1", formationId: "f1", nbStagiaires: 5,
    });
    prisma.session.findFirst.mockResolvedValueOnce({ id: "existing_session" });
    const { autoCreateSessionAndFicheEntrepriseOnDevisSigned } = await importModule();
    const res = await autoCreateSessionAndFicheEntrepriseOnDevisSigned("d1");
    expect("skipped" in res).toBe(true);
  });

  it("cas nominal : crée session + fiche entreprise + envoie email", async () => {
    const { prisma, email } = await importMocks();
    prisma.devis.findUnique.mockResolvedValueOnce({
      id: "d1", numero: "DEV-001", entrepriseId: "e1", contactId: "c1",
      entreprise: { nom: "Acme" },
      contact: { email: "j@acme.com", nom: "Dupont", prenom: "Jean" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce({
      id: "dem1", formationId: "f1", nbStagiaires: 5,
    });
    prisma.session.findFirst.mockResolvedValueOnce(null); // pas de session existante
    prisma.$transaction.mockImplementationOnce(async (fn: any) => fn({
      session: { create: vi.fn().mockResolvedValueOnce({ id: "sess_new", dateDebut: new Date(), dateFin: new Date() }) },
      fichePreFormationEntreprise: { create: vi.fn().mockResolvedValueOnce({ id: "fiche_new", tokenAcces: "tok_abc" }) },
      formation: { findUnique: vi.fn().mockResolvedValueOnce({ id: "f1", titre: "Formation Test" }) },
    }));
    const { autoCreateSessionAndFicheEntrepriseOnDevisSigned } = await importModule();
    const res = await autoCreateSessionAndFicheEntrepriseOnDevisSigned("d1");
    expect(res).toEqual({ sessionId: "sess_new", ficheEntrepriseId: "fiche_new" });
    expect(email.sendEmail).toHaveBeenCalled();
  });
});

describe("autoCreateFicheStagiaireOnInscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skipped si Inscription introuvable", async () => {
    const { prisma } = await importMocks();
    prisma.inscription.findUnique.mockResolvedValueOnce(null);
    const { autoCreateFicheStagiaireOnInscription } = await importModule();
    const res = await autoCreateFicheStagiaireOnInscription("inscr_inexistant");
    expect("error" in res).toBe(true);
  });

  it("skipped si session pas liée à un devis signé", async () => {
    const { prisma } = await importMocks();
    prisma.inscription.findUnique.mockResolvedValueOnce({
      id: "i1", sessionId: "s1", contactId: "c1",
      session: { id: "s1", formationId: "f1", dateDebut: new Date(), formation: { titre: "Formation" } },
      contact: { email: "stag@test.com", nom: "Stag", prenom: "Aire" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce(null); // pas de demande liée
    const { autoCreateFicheStagiaireOnInscription } = await importModule();
    const res = await autoCreateFicheStagiaireOnInscription("i1");
    expect("skipped" in res).toBe(true);
  });

  it("idempotent : skipped si fiche existe déjà pour ce contact+session", async () => {
    const { prisma } = await importMocks();
    prisma.inscription.findUnique.mockResolvedValueOnce({
      id: "i1", sessionId: "s1", contactId: "c1",
      session: { id: "s1", formationId: "f1", dateDebut: new Date(), formation: { titre: "Formation" } },
      contact: { email: "stag@test.com", nom: "Stag", prenom: "Aire" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce({ id: "dem1", devis: { statut: "signe" } });
    prisma.fichePreFormationStagiaire.findUnique.mockResolvedValueOnce({ id: "existing_fiche" });
    const { autoCreateFicheStagiaireOnInscription } = await importModule();
    const res = await autoCreateFicheStagiaireOnInscription("i1");
    expect("skipped" in res).toBe(true);
  });

  it("cas nominal : crée fiche stagiaire + envoie email", async () => {
    const { prisma, email } = await importMocks();
    prisma.inscription.findUnique.mockResolvedValueOnce({
      id: "i1", sessionId: "s1", contactId: "c1",
      session: { id: "s1", formationId: "f1", dateDebut: new Date(), formation: { titre: "Formation Test" } },
      contact: { email: "stag@test.com", nom: "Stag", prenom: "Aire" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce({ id: "dem1", devis: { statut: "signe" } });
    prisma.fichePreFormationStagiaire.findUnique.mockResolvedValueOnce(null);
    prisma.fichePreFormationStagiaire.create.mockResolvedValueOnce({ id: "fiche_stag_new", tokenAcces: "tok_xyz" });
    const { autoCreateFicheStagiaireOnInscription } = await importModule();
    const res = await autoCreateFicheStagiaireOnInscription("i1");
    expect(res).toEqual({ ficheStagiaireId: "fiche_stag_new" });
    expect(email.sendEmail).toHaveBeenCalled();
  });
});
