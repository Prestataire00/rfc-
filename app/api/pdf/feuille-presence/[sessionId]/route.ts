import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { feuillePresencePdf } from "@/lib/pdf/templates";
import { format, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: params.sessionId },
      include: {
        formation: true,
        formateur: true,
        inscriptions: {
          where: { statut: { in: ["confirmee", "presente", "en_attente"] } },
          include: { contact: { select: { nom: true, prenom: true } } },
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

    const docDef = feuillePresencePdf({
      formation: {
        titre: session.formation.titre,
        duree: session.formation.duree,
      },
      session: {
        dateDebut: format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr }),
        dateFin: format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr }),
        lieu: session.lieu || undefined,
      },
      formateur: session.formateur
        ? { nom: session.formateur.nom, prenom: session.formateur.prenom }
        : undefined,
      stagiaires: session.inscriptions.map((i) => ({
        nom: i.contact.nom,
        prenom: i.contact.prenom,
      })),
      dates,
    });

    const buffer = await generatePdfBuffer(docDef);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="feuille-presence-${session.id}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("Erreur generation feuille de presence PDF:", err);
    return NextResponse.json({ error: "Erreur lors de la generation de la feuille de presence" }, { status: 500 });
  }
}
