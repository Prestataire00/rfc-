export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { withErrorHandler } from "@/lib/api-wrapper";

// Generate evaluation tokens for participants, client, or formateur of a session
// Optionally accepts a templateId (preset or custom) whose questions are snapshotted
// into each created evaluation so that template edits later don't affect sent forms.
//
// Note transactions : la boucle stagiaire est idempotente (findFirst + create par
// inscription). On ne wrap PAS le tout dans un prisma.$transaction : un retry
// apres echec partiel doit pouvoir reprendre la ou il en etait sans dupliquer
// les tokens deja crees.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const { sessionId, type, cible = "stagiaire", templateId } = body as { sessionId?: string; type?: string; cible?: string; templateId?: string };

  if (!sessionId || !type) {
    return NextResponse.json({ error: "sessionId et type requis" }, { status: 400 });
  }

  if (!["stagiaire", "client", "formateur"].includes(cible)) {
    return NextResponse.json({ error: "cible doit être stagiaire, client ou formateur" }, { status: 400 });
  }

  // Load template questions for snapshot — either explicit templateId, or default preset for type
  let questionsSnapshot: string | null = null;
  if (templateId) {
    const tpl = await prisma.evaluationTemplate.findUnique({ where: { id: templateId } });
    if (tpl) questionsSnapshot = tpl.questions;
  } else if (["satisfaction_chaud", "satisfaction_froid", "acquis"].includes(type)) {
    // Lookup default preset for this type
    const presetId = type === "satisfaction_chaud" ? "preset_satisfaction_chaud"
      : type === "satisfaction_froid" ? "preset_satisfaction_froid"
      : "preset_acquis_post";
    const tpl = await prisma.evaluationTemplate.findUnique({ where: { id: presetId } });
    if (tpl) questionsSnapshot = tpl.questions;
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
          questionsSnapshot,
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
          questionsSnapshot,
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
          questionsSnapshot,
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
});
