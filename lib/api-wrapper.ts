// Wrapper standard pour routes API : capture les erreurs, log structuré, réponse JSON cohérente.
// Usage : export const POST = withErrorHandler(async (req) => { ... });
// Variante avec params : export const PUT = withErrorHandlerParams(async (req, ctx) => { ... });

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "./logger";

type Handler = (req: NextRequest) => Promise<Response> | Response;
type HandlerWithParams<P> = (req: NextRequest, ctx: { params: P }) => Promise<Response> | Response;

function buildErrorResponse(err: unknown, route: string): NextResponse {
  if (err instanceof ZodError) {
    logger.warn("api.validation_error", { route, issues: err.issues });
    return NextResponse.json(
      { error: "Données invalides", issues: err.issues },
      { status: 400 }
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error("api.prisma_error", err, { route, code: err.code });
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Conflit : doublon détecté" }, { status: 409 });
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }

  logger.error("api.unhandled_error", err, { route });
  const message = err instanceof Error ? err.message : "Erreur serveur";
  return NextResponse.json(
    { error: process.env.NODE_ENV === "production" ? "Erreur serveur" : message },
    { status: 500 }
  );
}

export function withErrorHandler(handler: Handler): Handler {
  return async (req: NextRequest) => {
    const route = new URL(req.url).pathname;
    try {
      return await handler(req);
    } catch (err) {
      return buildErrorResponse(err, route);
    }
  };
}

export function withErrorHandlerParams<P>(handler: HandlerWithParams<P>): HandlerWithParams<P> {
  return async (req: NextRequest, ctx: { params: P }) => {
    const route = new URL(req.url).pathname;
    try {
      return await handler(req, ctx);
    } catch (err) {
      return buildErrorResponse(err, route);
    }
  };
}
