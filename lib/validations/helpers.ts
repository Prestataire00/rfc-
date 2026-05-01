import { NextRequest } from "next/server";
import { z, ZodError, ZodIssue } from "zod";

// Parse + valide le JSON body d'une requête.
// Lance ZodError (capturée par withErrorHandler -> 400 + détails) si invalide.
// Lance Error si le body n'est pas du JSON valide.
export async function parseBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ZodError([
      { code: "custom", path: [], message: "JSON body invalide" } as unknown as ZodIssue,
    ]);
  }
  return schema.parse(raw);
}

// Parse + valide un fragment (PATCH/PUT) — toutes les clés deviennent optionnelles
export async function parsePartialBody<T extends z.ZodObject<z.ZodRawShape>>(
  req: NextRequest,
  schema: T
): Promise<Partial<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ZodError([
      { code: "custom", path: [], message: "JSON body invalide" } as unknown as ZodIssue,
    ]);
  }
  return schema.partial().parse(raw) as Partial<z.infer<T>>;
}
