import { describe, it, expect } from "vitest";
import { prospectCreationSchema } from "@/lib/validations/prospect";

describe("prospectCreationSchema", () => {
  const validPayload = {
    contact: {
      prenom: "Jean",
      nom: "Dupont",
      email: "jean.dupont@example.com",
      telephone: "0612345678",
      poste: "Responsable formation",
    },
    entrepriseMode: "nouvelle" as const,
    entrepriseNouvelle: {
      nom: "Acme Corp",
      siret: "12345678901234",
      adresse: "1 rue de la Paix",
      codePostal: "75001",
      ville: "Paris",
      secteur: "tertiaire",
      effectif: 50,
    },
    demande: {
      origine: "client" as const,
      sourceContact: "email",
      formationSouhaitee: "Formation SST initial",
      nbStagiaires: 5,
      datesSouhaitees: "courant juin 2026",
      budgetEnvisage: 3000,
      modeFinancement: "opco",
    },
    besoinsParticuliers: {
      handicapContraintes: "",
      materielSurPlace: "",
    },
    notesInternes: "",
  };

  it("accepte un payload valide avec entreprise nouvelle", () => {
    const result = prospectCreationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepte un payload avec entreprise existante", () => {
    const payload = {
      ...validPayload,
      entrepriseMode: "existante" as const,
      entrepriseId: "cuid_existant_xxx",
      entrepriseNouvelle: undefined,
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejette si entrepriseMode=nouvelle sans entrepriseNouvelle.nom", () => {
    const payload = {
      ...validPayload,
      entrepriseNouvelle: { ...validPayload.entrepriseNouvelle, nom: "" },
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejette si entrepriseMode=existante sans entrepriseId", () => {
    const payload = {
      ...validPayload,
      entrepriseMode: "existante" as const,
      entrepriseId: undefined,
      entrepriseNouvelle: undefined,
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejette un email contact invalide", () => {
    const payload = {
      ...validPayload,
      contact: { ...validPayload.contact, email: "pas-un-email" },
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejette si formationSouhaitee est vide", () => {
    const payload = {
      ...validPayload,
      demande: { ...validPayload.demande, formationSouhaitee: "" },
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("accepte un payload minimal (champs optionnels omis)", () => {
    const payload = {
      contact: {
        prenom: "Jean",
        nom: "Dupont",
        email: "jean@test.com",
      },
      entrepriseMode: "nouvelle" as const,
      entrepriseNouvelle: { nom: "Test SARL" },
      demande: {
        origine: "client" as const,
        formationSouhaitee: "SST",
      },
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
