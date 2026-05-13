export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

// Politique uploads : PDF / images / docs Office uniquement, 10 MB max.
const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Nettoie le nom de fichier client : retire path traversal / caractères dangereux
// et conserve uniquement la basename + extension. cf OWASP Unrestricted File Upload.
const sanitizeFilename = (name: string): string => {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180);
};

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Stockage non configuré — variables Supabase manquantes" },
      { status: 500 }
    );
  }

  const user = session.user as {
    role?: string;
    formateurId?: string | null;
  };
  const role = user.role ?? "";
  // Seuls admin et formateur peuvent uploader pour l'instant (les clients
  // accèdent à des documents mais n'en déposent pas via cette route).
  if (role !== "admin" && role !== "formateur") {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string;
  const sessionId = formData.get("sessionId") as string | null;
  // RBAC : un formateur ne peut JAMAIS attribuer un upload à un autre que
  // lui-même (forcer formateurId au session.user.formateurId, ignorer le
  // formData). Idem pour entrepriseId : un formateur ne lie pas à une
  // entreprise. Pour l'admin, on trust le formData.
  let formateurId: string | null;
  let entrepriseId: string | null;
  if (role === "formateur") {
    formateurId = user.formateurId ?? null;
    if (!formateurId) {
      return NextResponse.json(
        { error: "Compte formateur sans fiche associée — contactez un admin" },
        { status: 403 },
      );
    }
    entrepriseId = null;
  } else {
    formateurId = (formData.get("formateurId") as string | null) || null;
    entrepriseId = (formData.get("entrepriseId") as string | null) || null;
  }

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Type de fichier non autorisé (${file.type})` },
      { status: 415 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // UUID + sanitize : prévient collisions concurrentes + path traversal sur file.name.
  const safeName = sanitizeFilename(file.name);
  const storagePath = `documents/${randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("formapro")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false, // pas d'écrasement : si collision UUID (~impossible), on échoue plutôt que silencieusement écraser.
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
