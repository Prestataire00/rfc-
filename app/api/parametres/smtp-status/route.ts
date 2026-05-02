export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async () => {
  const configured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  return NextResponse.json({
    configured,
    host: configured ? process.env.SMTP_HOST || "smtp.gmail.com" : undefined,
  });
});
