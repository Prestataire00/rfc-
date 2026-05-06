export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// Verifie que l'utilisateur connecte est bien le formateur assigne a la session.
// Retourne le formateurId si OK, sinon une NextResponse d'erreur (401/403/404).
async function assertFormateurOwnsSession(sessionId: string): Promise<NextResponse | string> {
  const auth = await getServerSession(authOptions);
  if (!auth?.user || auth.user.role !== "formateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formateurId = (auth.user as any).formateurId as string | null;
  if (!formateurId) {
    return NextResponse.json({ error: "Formateur non lie a ce compte" }, { status: 403 });
  }
  const sess = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { formateurId: true },
  });
  if (!sess) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }
  if (sess.formateurId !== formateurId) {
    return NextResponse.json({ error: "Vous n'etes pas assigne a cette session" }, { status: 403 });
  }
  return formateurId;
}

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const check = await assertFormateurOwnsSession(params.id);
  if (check instanceof NextResponse) return check;

  const presences = await prisma.feuillePresence.findMany({
    where: { sessionId: params.id },
    include: { contact: { select: { nom: true, prenom: true } } },
    orderBy: [{ date: "asc" }, { contactId: "asc" }],
  });
  return NextResponse.json(presences);
});

// V1 — toggle simple matin/apresMidi (meme contrat que l'admin)
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const check = await assertFormateurOwnsSession(params.id);
  if (check instanceof NextResponse) return check;

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

// V2 — emargement numerique (statut detaille + signature) — meme contrat que l'admin
export const PATCH = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const check = await assertFormateurOwnsSession(params.id);
  if (check instanceof NextResponse) return check;

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
