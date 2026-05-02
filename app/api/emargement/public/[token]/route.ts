export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/emargement/public/[token]
// Retourne les infos de la session + liste des stagiaires pour ce creneau.
// Accessible sans authentification (scan QR).
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { token: string } }) => {
  const emToken = await prisma.emargementToken.findUnique({
    where: { token: params.token },
    include: {
      session: {
        include: {
          formation: { select: { titre: true, duree: true } },
          formateur: { select: { nom: true, prenom: true } },
          inscriptions: {
            where: { statut: { in: ["confirmee", "en_attente", "presente"] } },
            include: { contact: { select: { id: true, nom: true, prenom: true } } },
          },
        },
      },
    },
  });

  if (!emToken) {
    return NextResponse.json({ error: "Token invalide" }, { status: 404 });
  }

  if (new Date() > emToken.expiresAt) {
    return NextResponse.json({ error: "Token expire" }, { status: 410 });
  }

  // Si c'est un token OTP individuel (contactId set), ne renvoyer que ce stagiaire
  const isOtp = !!emToken.contactId;

  // Charger les presences existantes pour ce jour/creneau
  const dateStr = emToken.date.toISOString().split("T")[0];
  const presences = await prisma.feuillePresence.findMany({
    where: { sessionId: emToken.sessionId, date: emToken.date },
    select: {
      contactId: true,
      statutMatin: true,
      statutApresMidi: true,
      signatureMatin: true,
      signatureApresMidi: true,
    },
  });

  const presenceMap: Record<string, { statut: string | null; signed: boolean }> = {};
  for (const p of presences) {
    const isMatin = emToken.creneau === "matin";
    presenceMap[p.contactId] = {
      statut: isMatin ? p.statutMatin : p.statutApresMidi,
      signed: !!(isMatin ? p.signatureMatin : p.signatureApresMidi),
    };
  }

  const stagiaires = isOtp
    ? emToken.session.inscriptions
        .filter((i) => i.contactId === emToken.contactId)
        .map((i) => ({
          id: i.contact.id,
          nom: i.contact.nom,
          prenom: i.contact.prenom,
          presence: presenceMap[i.contact.id] || null,
        }))
    : emToken.session.inscriptions.map((i) => ({
        id: i.contact.id,
        nom: i.contact.nom,
        prenom: i.contact.prenom,
        presence: presenceMap[i.contact.id] || null,
      }));

  return NextResponse.json({
    sessionId: emToken.sessionId,
    date: dateStr,
    creneau: emToken.creneau,
    isOtp,
    formation: emToken.session.formation,
    formateur: emToken.session.formateur,
    lieu: emToken.session.lieu,
    stagiaires,
  });
});

// POST /api/emargement/public/[token]
// Soumet la signature d'un stagiaire.
// Body: { contactId, statut, signature (base64), retardMinutes?, departMinutes? }
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const emToken = await prisma.emargementToken.findUnique({ where: { token: params.token } });

  if (!emToken) {
    return NextResponse.json({ error: "Token invalide" }, { status: 404 });
  }
  if (new Date() > emToken.expiresAt) {
    return NextResponse.json({ error: "Token expire" }, { status: 410 });
  }

  // Si OTP, verifier que c'est bien le bon contact
  const body = await req.json();
  const { contactId, statut, signature, retardMinutes, departMinutes } = body;

  if (!contactId || !statut) {
    return NextResponse.json({ error: "contactId et statut requis" }, { status: 400 });
  }

  if (emToken.contactId && emToken.contactId !== contactId) {
    return NextResponse.json({ error: "Ce lien n'est pas pour ce stagiaire" }, { status: 403 });
  }

  const validStatuts = ["present", "absent", "en_retard", "excuse", "depart_anticipe"];
  if (!validStatuts.includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const now = new Date();
  const isMatin = emToken.creneau === "matin";
  const boolValue = ["present", "en_retard", "depart_anticipe"].includes(statut);

  const updateData = isMatin
    ? {
        statutMatin: statut,
        matin: boolValue,
        retardMinutes: statut === "en_retard" ? (retardMinutes || null) : null,
        ...(signature ? { signatureMatin: signature, signatureMatinIp: ip, signatureMatinAt: now } : {}),
      }
    : {
        statutApresMidi: statut,
        apresMidi: boolValue,
        departMinutes: statut === "depart_anticipe" ? (departMinutes || null) : null,
        ...(signature ? { signatureApresMidi: signature, signatureAmIp: ip, signatureAmAt: now } : {}),
      };

  const presence = await prisma.feuillePresence.upsert({
    where: {
      sessionId_contactId_date: { sessionId: emToken.sessionId, contactId, date: emToken.date },
    },
    update: updateData,
    create: {
      sessionId: emToken.sessionId,
      contactId,
      date: emToken.date,
      matin: isMatin ? boolValue : false,
      apresMidi: !isMatin ? boolValue : false,
      ...updateData,
    },
  });

  // Si OTP individuel, marquer le token comme utilise
  if (emToken.contactId) {
    await prisma.emargementToken.update({
      where: { id: emToken.id },
      data: { usedAt: now },
    });
  }

  return NextResponse.json({ ok: true, presence });
});
