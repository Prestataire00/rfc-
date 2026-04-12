export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { besoinStagiaireReponseSchema } from "@/lib/validations/besoin-stagiaire";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const fiche = await prisma.besoinStagiaire.findUnique({
      where: { tokenAcces: params.token },
      include: {
        session: {
          select: {
            id: true,
            dateDebut: true,
            dateFin: true,
            formation: { select: { titre: true, categorie: true } },
          },
        },
        contact: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            dateNaissance: true,
            numeroSecuriteSociale: true,
            numeroPasseportPrevention: true,
            niveauFormation: true,
          },
        },
      },
    });
    if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });

    // Masquer partiellement le numero de secu (ne revelons pas ce qui est en base pour un non-authentifie)
    if (fiche.contact?.numeroSecuriteSociale) {
      fiche.contact.numeroSecuriteSociale = "••••••••••••" + fiche.contact.numeroSecuriteSociale.slice(-3);
    }
    return NextResponse.json(fiche);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const fiche = await prisma.besoinStagiaire.findUnique({ where: { tokenAcces: params.token } });
    if (!fiche) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    if (fiche.statut === "repondu") {
      return NextResponse.json({ error: "Fiche deja soumise" }, { status: 409 });
    }

    const body = await req.json();
    const parsed = besoinStagiaireReponseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;

    // MAJ contact si donnees legales fournies (date naissance, n° secu, passeport prevention)
    const contactUpdate: Record<string, unknown> = {};
    if (d.dateNaissance) {
      const date = new Date(d.dateNaissance);
      if (!isNaN(date.getTime())) contactUpdate.dateNaissance = date;
    }
    if (d.numeroSecuriteSociale && !d.numeroSecuriteSociale.startsWith("•")) {
      contactUpdate.numeroSecuriteSociale = d.numeroSecuriteSociale.replace(/\s/g, "");
    }
    if (d.numeroPasseportPrevention) contactUpdate.numeroPasseportPrevention = d.numeroPasseportPrevention;
    if (d.niveauFormation) contactUpdate.niveauFormation = d.niveauFormation;
    if (d.estRQTH || d.detailsRQTH) {
      const details = [d.estRQTH ? "RQTH: oui" : null, d.detailsRQTH, d.contraintesPhysiques, d.contraintesLangue]
        .filter(Boolean).join(" | ");
      if (details) contactUpdate.besoinsAdaptation = details;
    }
    if (Object.keys(contactUpdate).length > 0) {
      await prisma.contact.update({ where: { id: fiche.contactId }, data: contactUpdate }).catch(() => {});
    }

    await prisma.besoinStagiaire.update({
      where: { id: fiche.id },
      data: {
        numeroPasseportPrevention: d.numeroPasseportPrevention ?? null,
        dejaSuivi: d.dejaSuivi,
        dateDerniereFormation: d.dateDerniereFormation ? new Date(d.dateDerniereFormation) : null,
        niveauFormation: d.niveauFormation ?? null,
        niveauPrerequis: d.niveauPrerequis ?? null,
        estRQTH: d.estRQTH,
        detailsRQTH: d.detailsRQTH ?? null,
        contraintesPhysiques: d.contraintesPhysiques ?? null,
        contraintesLangue: d.contraintesLangue ?? null,
        contraintesAlimentaires: d.contraintesAlimentaires ?? null,
        consentementRGPD: d.consentementRGPD,
        consentementBPF: d.consentementBPF,
        statut: "repondu",
        dateReponse: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("POST public besoin-stagiaire error:", err);
    return NextResponse.json({ error: "Erreur lors de la soumission" }, { status: 500 });
  }
}
