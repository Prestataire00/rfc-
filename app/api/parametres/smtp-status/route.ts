import { NextResponse } from "next/server";

export async function GET() {
  const configured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  return NextResponse.json({
    configured,
    host: configured ? process.env.SMTP_HOST || "smtp.gmail.com" : undefined,
  });
}
