export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// POST /api/upload-image
// Upload simple d'une image (photos formateurs, images formations, etc.)
// Ne cree pas de Document Prisma, retourne juste l'URL publique Supabase.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Stockage non configure (variables Supabase manquantes)" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "images";

    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

    // Validation type image
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Format non supporte (JPG, PNG, WEBP, GIF uniquement)" }, { status: 400 });
    }

    // Validation taille (5 Mo max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Fichier trop lourd (5 Mo max)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const sanitizedFolder = folder.replace(/[^a-z0-9-]/gi, "");
    const fileName = `${sanitizedFolder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("formapro")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Supabase upload image error:", uploadError);
      return NextResponse.json({ error: "Echec de l'upload" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("formapro").getPublicUrl(fileName);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: unknown) {
    console.error("Upload image error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
