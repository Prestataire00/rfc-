export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionSchema } from "@/lib/validations/session";
import { sendEmail, evaluationEmail } from "@/lib/email";
import { SESSION_STATUTS } from "@/lib/constants";
import { randomBytes } from "crypto";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: params.id },
      include: {
        formation: true,
        formateur: true,
        devis: { select: { id: true, numero: true, objet: true, statut: true, montantTTC: true } },
        inscriptions: {
          include: { contact: { include: { entreprise: { select: { id: true, nom: true } } } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!session) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    return NextResponse.json(session);
  } catch (err: unknown) {
    console.error("Erreur GET session:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération de la session" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { dateDebut, dateFin, formateurId, ...rest } = parsed.data;

    // Statut avant mise à jour
    const sessionAvant = await prisma.session.findUnique({
      where: { id: params.id },
      select: { statut: true },
    });

    const session = await prisma.session.update({
      where: { id: params.id },
      data: {
        ...rest,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        formateurId: formateurId ?? null,
      },
      include: {
        formation: { select: { titre: true } },
        inscriptions: {
          where: { statut: { in: ["confirmee", "presente"] } },
          include: { contact: { select: { id: true, prenom: true, nom: true, email: true } } },
        },
      },
    });

    // ── Envoi automatique questionnaire à chaud si passage à "terminee" ────
    if (rest.statut === "terminee" && sessionAvant?.statut !== "terminee") {
      const baseUrl = process.env.NEXTAUTH_URL || "https://projetrfc.netlify.app";

      for (const inscription of session.inscriptions) {
        if (!inscription.contact.email) continue;

        const existing = await prisma.evaluation.findFirst({
          where: { sessionId: params.id, contactId: inscription.contactId, type: "satisfaction_chaud" },
        });
        if (existing) continue;

        const token = randomBytes(32).toString("hex");
        await prisma.evaluation.create({
          data: {
            type: "satisfaction_chaud",
            cible: "stagiaire",
            sessionId: params.id,
            contactId: inscription.contactId,
            tokenAcces: token,
          },
        });

        const lien = `${baseUrl}/evaluation/${token}`;
        await sendEmail({
          to: inscription.contact.email,
          ...evaluationEmail({
            stagiaire: { prenom: inscription.contact.prenom, nom: inscription.contact.nom },
            formation: { titre: session.formation.titre },
            type: "satisfaction_chaud",
            lien,
          }),
        }).catch((e) => console.error("Erreur envoi email évaluation:", e));
      }
    }

    return NextResponse.json(session);
  } catch (err: unknown) {
    console.error("Erreur PUT session:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la session" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { statut } = await req.json();
    const VALID = Object.keys(SESSION_STATUTS);
    if (!statut || !VALID.includes(statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const sessionAvant = await prisma.session.findUnique({
      where: { id: params.id },
      select: { statut: true },
    });

    const session = await prisma.session.update({
      where: { id: params.id },
      data: { statut },
      include: {
        formation: { select: { titre: true } },
        inscriptions: {
          where: { statut: { in: ["confirmee", "presente"] } },
          include: { contact: { select: { id: true, prenom: true, nom: true, email: true } } },
        },
      },
    });

    // ── Envoi automatique questionnaire à chaud si passage à "terminee" ────
    if (statut === "terminee" && sessionAvant?.statut !== "terminee") {
      const baseUrl = process.env.NEXTAUTH_URL || "https://projetrfc.netlify.app";

      for (const inscription of session.inscriptions) {
        if (!inscription.contact.email) continue;

        const existing = await prisma.evaluation.findFirst({
          where: { sessionId: params.id, contactId: inscription.contactId, type: "satisfaction_chaud" },
        });
        if (existing) continue;

        const token = randomBytes(32).toString("hex");
        await prisma.evaluation.create({
          data: {
            type: "satisfaction_chaud",
            cible: "stagiaire",
            sessionId: params.id,
            contactId: inscription.contactId,
            tokenAcces: token,
          },
        });

        const lien = `${baseUrl}/evaluation/${token}`;
        await sendEmail({
          to: inscription.contact.email,
          ...evaluationEmail({
            stagiaire: { prenom: inscription.contact.prenom, nom: inscription.contact.nom },
            formation: { titre: session.formation.titre },
            type: "satisfaction_chaud",
            lien,
          }),
        }).catch((e) => console.error("Erreur envoi email évaluation:", e));
      }
    }

    return NextResponse.json({ statut: session.statut });
  } catch (err: unknown) {
    console.error("Erreur PATCH session statut:", err);
    return NextResponse.json({ error: "Erreur lors du changement de statut" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.session.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE session:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression de la session" }, { status: 500 });
  }
}
