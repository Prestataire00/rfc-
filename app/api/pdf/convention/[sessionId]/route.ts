export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { conventionPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const GET = withErrorHandlerParams<{ sessionId: string }>(async (req: NextRequest, { params }) => {
  const { searchParams } = new URL(req.url);
  const entrepriseIdParam = searchParams.get("entrepriseId");

  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: {
      formation: true,
      formateur: true,
      inscriptions: {
        include: { contact: { include: { entreprise: true } } },
      },
    },
  });

  if (!session) return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });

  // Collect distinct entreprises from inscriptions
  const entreprisesMap = new Map<string, NonNullable<(typeof session.inscriptions)[number]["contact"]["entreprise"]>>();
  for (const insc of session.inscriptions) {
    const e = insc.contact.entreprise;
    if (e && !entreprisesMap.has(e.id)) {
      entreprisesMap.set(e.id, e);
    }
  }

  let entreprise: { nom: string; adresse?: string | null; ville?: string | null; codePostal?: string | null; siret?: string | null } | null = null;
  let stagiairesFiltres = session.inscriptions;

  if (entrepriseIdParam) {
    // Mode entreprise spécifique
    const found = entreprisesMap.get(entrepriseIdParam);
    if (!found) {
      return NextResponse.json({ error: "Entreprise non trouvée pour cette session" }, { status: 404 });
    }
    entreprise = found;
    stagiairesFiltres = session.inscriptions.filter(
      (i) => i.contact.entreprise?.id === entrepriseIdParam
    );
  } else {
    const distinctEntreprises = Array.from(entreprisesMap.values());

    if (distinctEntreprises.length > 1) {
      return NextResponse.json(
        {
          error: "Plusieurs entreprises dans cette session. Précisez ?entrepriseId=",
          entreprises: distinctEntreprises.map((e) => ({ id: e.id, nom: e.nom })),
        },
        { status: 400 }
      );
    }

    // 0 ou 1 entreprise : on utilise la première ou un client générique
    entreprise = distinctEntreprises.length > 0 ? distinctEntreprises[0] : null;
  }

  const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });
  const annee = format(new Date(session.dateDebut), "yyyy");
  const numero = `CONV-${annee}-${session.id.slice(-4).toUpperCase()}${entreprise ? `-${entreprise.nom.slice(0, 4).toUpperCase()}` : ""}`;

  // Montant basé sur le tarif × nombre de stagiaires de cette entreprise
  const nbStagiaires = stagiairesFiltres.length || 1;
  const montantHT = session.formation.tarif * nbStagiaires;
  const montantTTC = montantHT * 1.2;

  const parametres = await getParametres();
  const branding = await resolveBranding(parametres);
  const template = await renderDocumentTemplate("convention", {
    formation: { titre: session.formation.titre, duree: session.formation.duree },
    session: { dateDebut, dateFin, lieu: session.lieu || "" },
    entreprise: {
      nomEntreprise: parametres.nomEntreprise,
      adresse: parametres.adresse,
      siret: parametres.siret,
      nda: parametres.nda,
    },
  });

  const docDef = conventionPdf({
    entreprise: {
      nom: entreprise?.nom || "Client",
      adresse: entreprise?.adresse || undefined,
      ville: entreprise?.ville || undefined,
      codePostal: entreprise?.codePostal || undefined,
      siret: entreprise?.siret || undefined,
    },
    formation: {
      titre: session.formation.titre,
      duree: session.formation.duree,
      objectifs: session.formation.objectifs || undefined,
    },
    session: { dateDebut, dateFin, lieu: session.lieu || undefined },
    montantHT,
    montantTTC,
    numero,
  }, { branding, template: template || undefined });

  const buffer = await generatePdfBuffer(docDef);
  const slug = entreprise?.nom.replace(/\s+/g, "-").toLowerCase().slice(0, 20) || "client";

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="convention-${slug}.pdf"`,
    },
  });
});
