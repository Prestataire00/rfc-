export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const presences = await prisma.feuillePresence.findMany({
    where: { sessionId: params.id },
    include: { contact: { select: { nom: true, prenom: true } } },
    orderBy: [{ date: "asc" }, { contactId: "asc" }],
  });
  return NextResponse.json(presences);
});

// V1 — toggle simple matin/apresMidi
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { contactId, date, matin, apresMidi } = await req.json();

  if (!contactId || !date) {
    return NextResponse.json({ error: "contactId et date requis" }, { status: 400 });
  }

  const dateObj = new Date(`${date}T00:00:00.000Z`);

  const presence = await prisma.feuillePresence.upsert({
    where: { sessionId_contactId_date: { sessionId: params.id, contactId, date: dateObj } },
    update: { matin: !!matin, apresMidi: !!apresMidi },
    create: { sessionId: params.id, contactId, date: dateObj, matin: !!matin, apresMidi: !!apresMidi },
  });

  return NextResponse.json(presence);
});

// V2 — emargement numerique : statut detaille + signature + metadonnees
// Body: { contactId, date, creneau: "matin"|"apres_midi", statut, retardMinutes?, departMinutes?, signature? }
// Le header X-Forwarded-For ou connection remoteAddress est utilise pour l'IP.
export const PATCH = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const { contactId, date, creneau, statut, retardMinutes, departMinutes, signature } = body;

  if (!contactId || !date || !creneau || !statut) {
    return NextResponse.json({ error: "contactId, date, creneau et statut requis" }, { status: 400 });
  }

  const validStatuts = ["present", "absent", "en_retard", "excuse", "depart_anticipe"];
  if (!validStatuts.includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const now = new Date();

  // Sync V1 booleans : present/en_retard/depart_anticipe => true, absent/excuse => false
  const boolValue = ["present", "en_retard", "depart_anticipe"].includes(statut);

  const isMatin = creneau === "matin";

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
    where: { sessionId_contactId_date: { sessionId: params.id, contactId, date: dateObj } },
    update: updateData,
    create: {
      sessionId: params.id,
      contactId,
      date: dateObj,
      matin: isMatin ? boolValue : false,
      apresMidi: !isMatin ? boolValue : false,
      ...updateData,
    },
  });

  return NextResponse.json(presence);
});
