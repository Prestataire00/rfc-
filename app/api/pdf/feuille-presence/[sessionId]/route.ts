export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { feuillePresencePdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { format, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

export const GET = withErrorHandlerParams<{ sessionId: string }>(async (_req: NextRequest, { params }) => {
  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: {
      formation: true,
      formateur: true,
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente", "en_attente"] } },
        include: { contact: { select: { id: true, nom: true, prenom: true } } },
      },
    },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const days = eachDayOfInterval({
    start: new Date(session.dateDebut),
    end: new Date(session.dateFin),
  });

  // Limit to 5 days max for layout
  const dates = days.slice(0, 5).map((d) => format(d, "dd/MM", { locale: fr }));

  const dateDebutFmt = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFinFmt = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });
  const parametres = await getParametres();
  const branding = await resolveBranding(parametres);
  const template = await renderDocumentTemplate("feuille_presence", {
    formation: { titre: session.formation.titre, duree: session.formation.duree },
    session: { dateDebut: dateDebutFmt, dateFin: dateFinFmt, lieu: session.lieu || "" },
    entreprise: {
      nomEntreprise: parametres.nomEntreprise,
      adresse: parametres.adresse,
      siret: parametres.siret,
      nda: parametres.nda,
    },
  });

  // V2 : charger les signatures pour les embarquer dans le PDF
  const presences = await prisma.feuillePresence.findMany({
    where: { sessionId: params.sessionId },
    select: {
      contactId: true,
      date: true,
      statutMatin: true,
      statutApresMidi: true,
      signatureMatin: true,
      signatureApresMidi: true,
      retardMinutes: true,
      departMinutes: true,
    },
  });

  // Construire une map contactId_date -> { signatures, statuts }
  type SigData = { signatureMatin?: string; signatureApresMidi?: string; statutMatin?: string; statutApresMidi?: string };
  const sigMap: Record<string, SigData> = {};
  for (const p of presences) {
    const key = `${p.contactId}_${format(new Date(p.date), "dd/MM", { locale: fr })}`;
    sigMap[key] = {
      signatureMatin: p.signatureMatin || undefined,
      signatureApresMidi: p.signatureApresMidi || undefined,
      statutMatin: p.statutMatin || undefined,
      statutApresMidi: p.statutApresMidi || undefined,
    };
  }

  const docDef = feuillePresencePdf({
    formation: {
      titre: session.formation.titre,
      duree: session.formation.duree,
    },
    session: {
      dateDebut: dateDebutFmt,
      dateFin: dateFinFmt,
      lieu: session.lieu || undefined,
    },
    formateur: session.formateur
      ? { nom: session.formateur.nom, prenom: session.formateur.prenom }
      : undefined,
    stagiaires: session.inscriptions.map((i) => ({
      nom: i.contact.nom,
      prenom: i.contact.prenom,
      id: i.contact.id,
    })),
    dates,
    signatures: sigMap,
  }, { branding, template: template || undefined });

  const buffer = await generatePdfBuffer(docDef);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="feuille-presence-${session.id}.pdf"`,
    },
  });
});
