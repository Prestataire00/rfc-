import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: params.id },
    include: {
      session: { include: { formation: true, formateur: true } },
      contact: true,
    },
  });
  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(evaluation);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const evaluation = await prisma.evaluation.update({
    where: { id: params.id },
    data: {
      noteGlobale: body.noteGlobale ? parseInt(body.noteGlobale) : null,
      reponses: body.reponses ? JSON.stringify(body.reponses) : undefined,
      commentaire: body.commentaire || null,
      estComplete: body.estComplete ?? false,
    },
  });

  return NextResponse.json(evaluation);
}
