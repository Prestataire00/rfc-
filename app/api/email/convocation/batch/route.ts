export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-wrapper";
import { sendConvocationsForSession } from "@/lib/convocations/send";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  try {
    const result = await sendConvocationsForSession(sessionId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && /introuvable/.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
});
