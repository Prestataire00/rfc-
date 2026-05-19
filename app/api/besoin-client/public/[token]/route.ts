// Redirect 301 vers la nouvelle URL API — backward compat.
// À supprimer le 2026-11-16.
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const dynamic = "force-dynamic";

export const GET = withErrorHandlerParams<{ token: string }>(async (_req: NextRequest, { params }) => {
  return NextResponse.redirect(
    new URL(`/api/qualiopi/fiches-entreprise/public/${params.token}`, _req.url),
    { status: 301 },
  );
});

export const POST = withErrorHandlerParams<{ token: string }>(async (req: NextRequest, { params }) => {
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
});
