export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/historique";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inscriptions = await prisma.inscription.findMany({
      where: { sessionId: params.id },
      include: {
        contact: { include: { entreprise: { select: { nom: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(inscriptions);
  } catch (err: unknown) {
    console.error("Erreur GET inscriptions:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des inscriptions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { contactId, statut = "en_attente", notes } = body;

    if (!contactId) {
      return NextResponse.json({ error: "contactId requis" }, { status: 400 });
    }

    // Check capacity
    const session = await prisma.session.findUnique({
      where: { id: params.id },
      include: { _count: { select: { inscriptions: true } } },
    });

    if (!session) return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });

    if (session._count.inscriptions >= session.capaciteMax) {
      return NextResponse.json({ error: "Session complète" }, { status: 409 });
    }

    // Check duplicate
    const existing = await prisma.inscription.findUnique({
      where: { contactId_sessionId: { contactId, sessionId: params.id } },
    });

    if (existing) {
      return NextResponse.json({ error: "Contact déjà inscrit" }, { status: 409 });
    }

    const sessionWithFormation = await prisma.session.findUnique({
      where: { id: params.id },
      include: { formation: true },
    });
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { nom: true, prenom: true, entrepriseId: true },
    });

    const inscription = await prisma.inscription.create({
      data: { contactId, sessionId: params.id, statut, notes },
      include: { contact: true },
    });

    if (sessionWithFormation && contact) {
      try {
        await logAction({
          action: "inscription_creee",
          label: contact.prenom + " " + contact.nom + " inscrit à " + sessionWithFormation.formation.titre,
          lien: "/sessions/" + params.id,
          entrepriseId: contact.entrepriseId ?? undefined,
          contactId: contactId,
          sessionId: params.id,
        });
      } catch (logErr) {
        console.warn("logAction inscription_creee échoué:", logErr);
      }
    }

    // Fire-and-forget : automations + notifications
    triggerAutomation("inscription_created", {
      inscriptionId: inscription.id,
      sessionId: params.id,
      contactId,
      entrepriseId: contact?.entrepriseId ?? undefined,
      formationId: sessionWithFormation?.formation.id,
    }).catch((err) => console.error("[automation] inscription_created:", err));

    const traineeName = contact ? `${contact.prenom} ${contact.nom}` : "Un stagiaire";
    const sessionTitle = sessionWithFormation?.formation.titre ?? "une session";

    notifyAdmins({
      titre: "Nouvelle inscription",
      message: `${traineeName} inscrit(e) a ${sessionTitle}`,
      type: "info",
      lien: `/sessions/${params.id}`,
    }).catch(() => {});

    return NextResponse.json(inscription, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur POST inscription:", err);
    return NextResponse.json({ error: "Erreur lors de la creation de l'inscription" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { inscriptionId, statut } = body;

    if (!inscriptionId || !statut) {
      return NextResponse.json({ error: "inscriptionId et statut requis" }, { status: 400 });
    }

    const inscription = await prisma.inscription.update({
      where: { id: inscriptionId },
      data: { statut },
    });

    return NextResponse.json(inscription);
  } catch (err: unknown) {
    console.error("Erreur PATCH inscription:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de l'inscription" }, { status: 500 });
  }
}
