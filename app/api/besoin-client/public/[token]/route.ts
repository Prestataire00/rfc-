// Redirect 301 vers la nouvelle URL API — backward compat.
// À supprimer le 2026-11-16.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  return NextResponse.redirect(
    new URL(`/api/qualiopi/fiches-entreprise/public/${params.token}`, _req.url),
    { status: 301 },
  );
}

export function POST(req: NextRequest, { params }: { params: { token: string } }) {
  // POST avec body ne peut pas redirect simplement (body perdu). 410 Gone
  // avec instruction claire pour debug.
  return NextResponse.json(
    {
      error: "Cette URL d'API est dépréciée. Utiliser /api/qualiopi/fiches-entreprise/public/" + params.token,
      legacyUrl: req.url,
      newUrl: `/api/qualiopi/fiches-entreprise/public/${params.token}`,
    },
    { status: 410 },
  );
}
