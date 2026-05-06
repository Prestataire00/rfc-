export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { ficheInscriptionPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const GET = withErrorHandlerParams<{ contactId: string }>(
  async (req: NextRequest, { params }) => {
    const url = new URL(req.url);
    const inscriptionIdParam = url.searchParams.get("inscriptionId");

    const [contact, parametres] = await Promise.all([
      prisma.contact.findUnique({
        where: { id: params.contactId },
        include: {
          inscriptions: {
            orderBy: { createdAt: "desc" },
            include: { session: { include: { formation: true } } },
          },
        },
      }),
      getParametres(),
    ]);

    if (!contact) {
      return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
    }

    // Pick the inscription : explicit param OR most recent OR none
    let chosen = inscriptionIdParam
      ? contact.inscriptions.find((i) => i.id === inscriptionIdParam) || null
      : contact.inscriptions[0] || null;

    let formation: { titre: string; categorie?: string | null; duree: number; tarif: number; certifiante?: boolean } | null = null;
    let session: { dateDebut: string; dateFin: string; lieu?: string | null } | null = null;
    let documentsRemis: string[] = [];

    if (chosen) {
      formation = {
        titre: chosen.session.formation.titre,
        categorie: chosen.session.formation.categorie,
        duree: chosen.session.formation.duree,
        tarif: chosen.session.formation.tarif,
        certifiante: chosen.session.formation.certifiante,
      };
      session = {
        dateDebut: chosen.session.dateDebut.toISOString(),
        dateFin: chosen.session.dateFin.toISOString(),
        lieu: chosen.session.lieu,
      };
      try {
        const parsed = JSON.parse(chosen.documentsRemis || "[]");
        if (Array.isArray(parsed)) documentsRemis = parsed.filter((x) => typeof x === "string");
      } catch {
        documentsRemis = [];
      }
    }

    const branding = await resolveBranding(parametres);

    const docDef = ficheInscriptionPdf({
      contact: {
        nom: contact.nom,
        prenom: contact.prenom,
        sexe: contact.sexe,
        email: contact.email,
        telephone: contact.telephone,
        dateNaissance: contact.dateNaissance ? contact.dateNaissance.toISOString() : null,
        lieuNaissance: contact.lieuNaissance,
        pays: contact.pays,
        numeroSecuriteSociale: contact.numeroSecuriteSociale,
        adressePerso: contact.adressePerso,
        codePostalPerso: contact.codePostalPerso,
        villePerso: contact.villePerso,
        numeroCartePro: contact.numeroCartePro,
        numeroFranceTravail: contact.numeroFranceTravail,
        niveauFormation: contact.niveauFormation,
        diplomeObtenu: contact.diplomeObtenu,
      },
      formation: formation || undefined,
      session,
      documentsRemis,
      dateGeneration: format(new Date(), "dd/MM/yyyy", { locale: fr }),
    }, { branding });

    const buffer = await generatePdfBuffer(docDef);
    const safeName = `${contact.nom}-${contact.prenom}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="fiche-inscription-${safeName}.pdf"`,
      },
    });
  }
);
