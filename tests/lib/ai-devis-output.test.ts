import { describe, it, expect } from "vitest";
import { aiDevisOutputSchema } from "@/lib/validations/ai-devis-output";

describe("aiDevisOutputSchema", () => {
  const valid = {
    formationId: "ckxxx0000000000000000000",
    objet: "Formation SST initiale 14h - 5 stagiaires",
    lignes: [
      { designation: "Formation SST", quantite: 5, prixUnitaire: 350 },
    ],
    rationale: "Match parfait sur la durée demandée et le public cible",
  };

  it("accepte un output valide", () => {
    expect(aiDevisOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette formationId non cuid", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, formationId: "not-a-cuid" }).success).toBe(false);
  });

  it("rejette objet trop court", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, objet: "x" }).success).toBe(false);
  });

  it("rejette objet trop long", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, objet: "x".repeat(201) }).success).toBe(false);
  });

  it("rejette lignes vide", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, lignes: [] }).success).toBe(false);
  });

  it("rejette quantite négative", () => {
    expect(aiDevisOutputSchema.safeParse({
      ...valid,
      lignes: [{ designation: "x", quantite: -1, prixUnitaire: 100 }],
    }).success).toBe(false);
  });

  it("rejette prixUnitaire négatif", () => {
    expect(aiDevisOutputSchema.safeParse({
      ...valid,
      lignes: [{ designation: "x", quantite: 1, prixUnitaire: -100 }],
    }).success).toBe(false);
  });

  it("accepte rationale vide", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, rationale: "" }).success).toBe(true);
  });
});
