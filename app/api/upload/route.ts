export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Stockage non configuré — variables Supabase manquantes" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string;
  const sessionId = formData.get("sessionId") as string | null;
  const formateurId = formData.get("formateurId") as string | null;
  const entrepriseId = formData.get("entrepriseId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${file.name}`;
  const storagePath = `documents/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("formapro")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    logger.error("upload.supabase_failed", uploadError, { storagePath, fileType: file.type });
    return NextResponse.json(
      { error: "Stockage non configuré — échec de l'upload Supabase" },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage.from("formapro").getPublicUrl(storagePath);
  const chemin = urlData.publicUrl;

  const document = await prisma.document.create({
    data: {
      nom: file.name,
      type: type || "autre",
      chemin,
      taille: file.size,
      sessionId: sessionId || null,
      formateurId: formateurId || null,
      entrepriseId: entrepriseId || null,
    },
  });

  return NextResponse.json(document, { status: 201 });
});
