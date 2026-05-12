export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { avancerEtapeSchema } from "@/lib/pipeline/schemas";
import { advanceProspectEtape } from "@/lib/pipeline/service";
import type { UserRole } from "@/lib/pipeline/transitions";

export const POST = withErrorHandlerParams(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = session.user.role as UserRole;
    if (role !== "admin") {
      return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });
    }

    const body = await parseBody(req, avancerEtapeSchema);
    const result = await advanceProspectEtape(params.id, body.toEtape, {
      notes: body.notes,
      byUserId: session.user.id,
      role,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  },
);
