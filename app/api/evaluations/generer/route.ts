export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

// Generate evaluation tokens for participants, client, or formateur of a session
export async function POST(req: NextRequest) {
  try {
    const { sessionId, type, cible = "stagiaire" } = await req.json();

    if (!sessionId || !type) {
      return NextResponse.json({ error: "sessionId et type requis" }, { status: 400 });
    }

    if (!["stagiaire", "client", "formateur"].includes(cible)) {
      return NextResponse.json({ error: "cible doit être stagiaire, client ou formateur" }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        inscriptions: {
          where: { statut: { in: ["confirmee", "presente"] } },
          include: { contact: true },
        },
        formateur: true,
        formation: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    const evaluations = [];

    if (cible === "stagiaire") {
      // Current behavior: create for each inscription contact
      for (const inscription of session.inscriptions) {
        const existing = await prisma.evaluation.findFirst({
          where: {
            sessionId,
            contactId: inscription.contactId,
            type,
            cible: "stagiaire",
          },
        });

        if (existing) {
          evaluations.push(existing);
          continue;
        }

        const token = randomBytes(32).toString("hex");
        const evaluation = await prisma.evaluation.create({
          data: {
            type,
            cible: "stagiaire",
            sessionId,
            contactId: inscription.contactId,
            tokenAcces: token,
          },
        });
        evaluations.push(evaluation);
      }
    } else if (cible === "client") {
      // Find the client contact: look for a contact with type "client" from inscriptions,
      // or fall back to any inscription contact's entreprise contact
      let clientContact = session.inscriptions.find(
        (i) => i.contact.type === "client"
      )?.contact;

      // If no client type contact found, use first inscription contact as fallback
      if (!clientContact && session.inscriptions.length > 0) {
        clientContact = session.inscriptions[0].contact;
      }

      if (!clientContact) {
        return NextResponse.json({ error: "Aucun contact client trouvé pour cette session" }, { status: 404 });
      }

      const existing = await prisma.evaluation.findFirst({
        where: {
          sessionId,
          contactId: clientContact.id,
          type,
          cible: "client",
        },
      });

      if (existing) {
        evaluations.push(existing);
      } else {
        const token = randomBytes(32).toString("hex");
        const evaluation = await prisma.evaluation.create({
          data: {
            type,
            cible: "client",
            sessionId,
            contactId: clientContact.id,
            tokenAcces: token,
          },
        });
        evaluations.push(evaluation);
      }
    } else if (cible === "formateur") {
      // Create one evaluation for the session's formateur
      if (!session.formateur) {
        return NextResponse.json({ error: "Aucun formateur assigné à cette session" }, { status: 404 });
      }

      // Look up a contact matching the formateur's email (if exists)
      const formateurContact = await prisma.contact.findUnique({
        where: { email: session.formateur.email },
      });

      const contactId = formateurContact?.id || null;

      const existing = await prisma.evaluation.findFirst({
        where: {
          sessionId,
          type,
          cible: "formateur",
          ...(contactId ? { contactId } : {}),
        },
      });

      if (existing) {
        evaluations.push(existing);
      } else {
        const token = randomBytes(32).toString("hex");
        const evaluation = await prisma.evaluation.create({
          data: {
            type,
            cible: "formateur",
            sessionId,
            contactId,
            tokenAcces: token,
          },
        });
        evaluations.push(evaluation);
      }
    }

    return NextResponse.json({
      count: evaluations.length,
      evaluations: evaluations.map((e) => ({
        id: e.id,
        contactId: e.contactId,
        token: e.tokenAcces,
        estComplete: e.estComplete,
      })),
    });
  } catch (err: unknown) {
    console.error("Erreur generation des evaluations:", err);
    return NextResponse.json({ error: "Erreur lors de la generation des evaluations" }, { status: 500 });
  }
}
