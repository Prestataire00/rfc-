import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CatalogueClient, { type Formation } from "./catalogue-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue de formations — RFC Rescue Formation Conseil",
  description:
    "Sécurité, incendie, prévention — formations certifiantes et recyclages obligatoires en présentiel, distanciel et mixte.",
  openGraph: {
    title: "Catalogue de formations — RFC",
    description:
      "Sécurité, incendie, prévention — formations certifiantes et recyclages obligatoires.",
    type: "website",
    locale: "fr_FR",
  },
};

export default async function CataloguePage() {
  const formations = await prisma.formation.findMany({
    where: { statut: "publiee", actif: true },
    orderBy: [{ misEnAvant: "desc" }, { titre: "asc" }],
    select: {
      id: true,
      titre: true,
      description: true,
      duree: true,
      tarif: true,
      categorie: true,
      modalite: true,
      certifiante: true,
      niveau: true,
      misEnAvant: true,
      image: true,
      publicCible: true,
      sessions: {
        where: {
          dateDebut: { gte: new Date() },
          statut: { in: ["planifiee", "confirmee"] },
        },
        orderBy: { dateDebut: "asc" },
        select: {
          id: true,
          dateDebut: true,
          dateFin: true,
          lieu: true,
          capaciteMax: true,
          tokenInscription: true,
          _count: { select: { inscriptions: true } },
        },
      },
    },
  });

  const formationsWithPlaces: Formation[] = formations.map((f) => ({
    id: f.id,
    titre: f.titre,
    description: f.description,
    duree: f.duree,
    tarif: f.tarif,
    categorie: f.categorie,
    modalite: f.modalite,
    certifiante: f.certifiante,
    niveau: f.niveau,
    misEnAvant: f.misEnAvant,
    image: f.image,
    publicCible: f.publicCible,
    sessions: f.sessions.map((s) => ({
      id: s.id,
      dateDebut: s.dateDebut.toISOString(),
      dateFin: s.dateFin.toISOString(),
      lieu: s.lieu,
      placesRestantes: s.capaciteMax - s._count.inscriptions,
      tokenInscription: s.tokenInscription,
    })),
  }));

  const categories = Array.from(
    new Set(formationsWithPlaces.map((f) => f.categorie).filter((c): c is string => Boolean(c))),
  ).sort();

  return <CatalogueClient formations={formationsWithPlaces} categories={categories} />;
}
