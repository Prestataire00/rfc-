import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
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
    let chemin = "";

    // Try Supabase Storage first
    try {
      const { supabase } = await import("@/lib/supabase");
      const storagePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("formapro")
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("formapro").getPublicUrl(storagePath);
        chemin = urlData.publicUrl;
      } else {
        throw uploadError;
      }
    } catch {
      // Fallback: save locally in public/documents/
      const dir = path.join(process.cwd(), "public", "documents");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, fileName), buffer);
      chemin = `/documents/${fileName}`;
    }

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
  } catch (err: unknown) {
    console.error("Erreur lors de l'upload du fichier:", err);
    return NextResponse.json({ error: "Erreur lors de l'upload du fichier" }, { status: 500 });
  }
}
