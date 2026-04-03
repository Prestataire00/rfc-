export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisSchema } from "@/lib/validations/devis";
import { logAction } from "@/lib/historique";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const devis = await prisma.devis.findUnique({
      where: { id: params.id },
      include: {
        lignes: true,
        entreprise: true,
        contact: true,
        factures: true,
        sessions: { select: { id: true, dateDebut: true, dateFin: true, statut: true } },
      },
    });
    if (!devis) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    return NextResponse.json(devis);
  } catch (err: unknown) {
    console.error("Erreur GET devis:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du devis" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    // Handle simple statut update
    if (body.statut && Object.keys(body).length === 1) {
      const devis = await prisma.devis.update({
        where: { id: params.id },
        data: { statut: body.statut },
      });
      try {
        await logAction({
          action: "devis_statut",
          label: "Devis " + devis.numero + " → " + body.statut,
          lien: "/commercial/devis/" + params.id,
          entrepriseId: devis.entrepriseId ?? undefined,
          devisId: params.id,
        });
      } catch {}
      return NextResponse.json(devis);
    }

    const parsed = devisSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { lignes, dateValidite, entrepriseId, contactId, tauxTVA, ...rest } = parsed.data;
    const montantHT = lignes.reduce((sum, l) => sum + l.montant, 0);
    const montantTTC = montantHT * (1 + tauxTVA / 100);

    await prisma.ligneDevis.deleteMany({ where: { devisId: params.id } });

    const devis = await prisma.devis.update({
      where: { id: params.id },
      data: {
        ...rest,
        tauxTVA,
        montantHT,
        montantTTC,
        dateValidite: new Date(dateValidite),
        entrepriseId: entrepriseId || null,
        contactId: contactId || null,
        lignes: { create: lignes },
      },
      include: { lignes: true },
    });
    return NextResponse.json(devis);
  } catch (err: unknown) {
    console.error("Erreur PUT devis:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du devis" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.devis.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE devis:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du devis" }, { status: 500 });
  }
}
