export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [contacts, entreprises, sessions, devis, factures, besoins] = await Promise.all([
    prisma.contact.findMany({
      where: { OR: [{ nom: { contains: q, mode: "insensitive" } }, { prenom: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
      select: { id: true, nom: true, prenom: true, type: true, entreprise: { select: { nom: true } } },
      take: 5,
    }),
    prisma.entreprise.findMany({
      where: { OR: [{ nom: { contains: q, mode: "insensitive" } }, { siret: { contains: q } }] },
      select: { id: true, nom: true, siret: true },
      take: 5,
    }),
    prisma.session.findMany({
      where: { OR: [{ lieu: { contains: q, mode: "insensitive" } }, { formation: { titre: { contains: q, mode: "insensitive" } } }] },
      select: { id: true, dateDebut: true, formation: { select: { titre: true } } },
      take: 5,
    }),
    prisma.devis.findMany({
      where: { numero: { contains: q, mode: "insensitive" } },
      select: { id: true, numero: true, montantTTC: true, statut: true, entreprise: { select: { nom: true } } },
      take: 5,
    }),
    prisma.facture.findMany({
      where: { numero: { contains: q, mode: "insensitive" } },
      select: { id: true, numero: true, montantTTC: true, statut: true },
      take: 5,
    }),
    prisma.besoinFormation.findMany({
      where: { titre: { contains: q, mode: "insensitive" } },
      select: { id: true, titre: true, statut: true },
      take: 5,
    }),
  ]);

  const results = [
    ...contacts.map((c) => ({ type: "contact", id: c.id, title: `${c.prenom} ${c.nom}`, subtitle: `${c.type}${c.entreprise ? " · " + c.entreprise.nom : ""}`, href: `/contacts/${c.id}` })),
    ...entreprises.map((e) => ({ type: "entreprise", id: e.id, title: e.nom, subtitle: e.siret ?? "Entreprise", href: `/entreprises/${e.id}` })),
    ...sessions.map((s) => ({ type: "session", id: s.id, title: s.formation.titre, subtitle: new Date(s.dateDebut).toLocaleDateString("fr-FR"), href: `/sessions/${s.id}` })),
    ...devis.map((d) => ({ type: "devis", id: d.id, title: d.numero, subtitle: `${d.montantTTC.toFixed(2)} EUR · ${d.statut}`, href: `/commercial/devis/${d.id}` })),
    ...factures.map((f) => ({ type: "facture", id: f.id, title: f.numero, subtitle: `${f.montantTTC.toFixed(2)} EUR · ${f.statut}`, href: `/commercial/factures/${f.id}` })),
    ...besoins.map((b) => ({ type: "besoin", id: b.id, title: b.titre, subtitle: `Besoin · ${b.statut}`, href: `/besoins/${b.id}` })),
  ];

  return NextResponse.json({ results });
});
