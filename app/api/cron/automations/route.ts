export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// Moteur V1 déprécié — remplacé par /api/cron/automations-v2 (chantier 2).
// Le cron Netlify a été retiré. Si quelqu'un appelle encore cette route (ancien cron externe,
// scénario Make, lien dans la doc), on répond 410 Gone explicitement pour éviter les exécutions
// silencieuses qui doublent les emails partis du V2.
export async function GET() {
  return NextResponse.json(
    {
      error: "Gone",
      message: "Le moteur d'automatisations V1 est déprécié. Utilisez le builder V2 (/admin/automations-v2).",
      replacement: "/api/cron/automations-v2",
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Gone",
      message: "Le moteur V1 est déprécié.",
      replacement: "/api/cron/automations-v2",
    },
    { status: 410 }
  );
}
