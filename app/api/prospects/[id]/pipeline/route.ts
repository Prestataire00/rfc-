export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { getProspectPipeline } from "@/lib/pipeline/service";

export const GET = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await getProspectPipeline(params.id);
    if (!data) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }
    return NextResponse.json(data);
  },
);
