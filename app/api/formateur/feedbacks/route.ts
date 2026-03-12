import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "formateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formateurId = (session.user as any).formateurId;
  if (!formateurId) return NextResponse.json([]);

  const feedbacks = await prisma.feedbackFormateur.findMany({
    where: { formateurId },
    include: {
      session: { include: { formation: { select: { titre: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(feedbacks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "formateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formateurId = (session.user as any).formateurId;
  if (!formateurId) return NextResponse.json({ error: "No formateur linked" }, { status: 400 });

  const body = await req.json();

  const feedback = await prisma.feedbackFormateur.create({
    data: {
      formateurId,
      sessionId: body.sessionId,
      noteGlobale: parseInt(body.noteGlobale),
      commentaire: body.commentaire || null,
      conditionsMat: body.conditionsMat || null,
      dynamiqueGroupe: body.dynamiqueGroupe || null,
      suggestions: body.suggestions || null,
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}
