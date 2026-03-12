import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string;
  const sessionId = formData.get("sessionId") as string | null;
  const formateurId = formData.get("formateurId") as string | null;
  const entrepriseId = formData.get("entrepriseId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${file.name}`;
  const path = `documents/${fileName}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("formapro")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("formapro").getPublicUrl(path);

  // Save to DB
  const document = await prisma.document.create({
    data: {
      nom: file.name,
      type: type || "autre",
      chemin: urlData.publicUrl,
      taille: file.size,
      sessionId: sessionId || null,
      formateurId: formateurId || null,
      entrepriseId: entrepriseId || null,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
