export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

const DEFAULT_CHAUD = [
  {
    id: "contenu", titre: "Contenu & Objectifs",
    questions: [
      { key: "contenu", label: "Le contenu correspondait à vos attentes initiales" },
      { key: "objectifs", label: "Les objectifs pédagogiques ont été atteints" },
      { key: "applicable", label: "Les connaissances acquises sont applicables dans votre travail" },
    ],
  },
  {
    id: "pedagogie", titre: "Pédagogie & Formateur",
    questions: [
      { key: "pedagogie", label: "Les méthodes pédagogiques étaient adaptées" },
      { key: "formateur", label: "Le formateur était compétent et à l'écoute" },
      { key: "rythme", label: "Le rythme de la formation était adapté" },
    ],
  },
  {
    id: "organisation", titre: "Organisation & Logistique",
    questions: [
      { key: "organisation", label: "L'organisation générale était satisfaisante" },
      { key: "supports", label: "Les supports et outils pédagogiques étaient de qualité" },
      { key: "duree", label: "La durée de la formation était adaptée au contenu" },
    ],
  },
];

const DEFAULT_FROID = [
  {
    id: "impact", titre: "Mise en pratique",
    questions: [
      { key: "mise_en_pratique", label: "Vous avez pu mettre en pratique les connaissances acquises" },
      { key: "impact_travail", label: "La formation a eu un impact positif sur votre travail" },
      { key: "competences", label: "Vous estimez avoir progressé dans vos compétences" },
    ],
  },
  {
    id: "recommandation", titre: "Appréciation générale",
    questions: [
      { key: "recommandation", label: "Vous recommanderiez cette formation à un collègue" },
      { key: "besoin_complement", label: "Vous estimez avoir besoin d'une formation complémentaire" },
      { key: "satisfaction_globale", label: "Vous êtes globalement satisfait de cette formation" },
    ],
  },
];

export const GET = withErrorHandler(async () => {
  let config = await prisma.questionnaireConfig.findUnique({ where: { id: "default" } });
  if (!config) {
    config = await prisma.questionnaireConfig.create({
      data: { id: "default", chaud: DEFAULT_CHAUD, froid: DEFAULT_FROID },
    });
  }
  // If empty, return defaults
  const chaud = Array.isArray(config.chaud) && config.chaud.length > 0 ? config.chaud : DEFAULT_CHAUD;
  const froid = Array.isArray(config.froid) && config.froid.length > 0 ? config.froid : DEFAULT_FROID;
  return NextResponse.json({ chaud, froid });
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const { chaud, froid } = await req.json();
  const config = await prisma.questionnaireConfig.upsert({
    where: { id: "default" },
    create: { id: "default", chaud, froid },
    update: { chaud, froid },
  });
  return NextResponse.json(config);
});
