import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { password } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caracteres" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: params.id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ success: true });
}
