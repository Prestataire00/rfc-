// Logger central — JSON structuré en prod, lisible en dev.
// Usage : logger.info("event", { ...meta }) | logger.error("event", err, { ...meta })
// En production, alimente les outils d'observabilité (Sentry, Logtail, etc.) via console.

type Level = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";
const minLevel: Level = (process.env.LOG_LEVEL as Level) || (isProd ? "info" : "debug");

const levelOrder: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldLog(level: Level): boolean {
  return levelOrder[level] >= levelOrder[minLevel];
}

function format(level: Level, event: string, meta?: Record<string, unknown>) {
  if (isProd) {
    return JSON.stringify({
      level,
      event,
      timestamp: new Date().toISOString(),
      ...(meta || {}),
    });
  }
  const tag = `[${level.toUpperCase()}] ${event}`;
  return meta && Object.keys(meta).length > 0 ? `${tag} ${JSON.stringify(meta)}` : tag;
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      error: err.message,
      stack: err.stack,
      name: err.name,
    };
  }
  return { error: String(err) };
}

export const logger = {
  debug(event: string, meta?: Record<string, unknown>) {
    if (!shouldLog("debug")) return;
    console.debug(format("debug", event, meta));
  },
  info(event: string, meta?: Record<string, unknown>) {
    if (!shouldLog("info")) return;
    console.info(format("info", event, meta));
  },
  warn(event: string, meta?: Record<string, unknown>) {
    if (!shouldLog("warn")) return;
    console.warn(format("warn", event, meta));
  },
  error(event: string, err?: unknown, meta?: Record<string, unknown>) {
    if (!shouldLog("error")) return;
    const errMeta = err !== undefined ? serializeError(err) : {};
    console.error(format("error", event, { ...errMeta, ...(meta || {}) }));
    forwardToSentry(event, err, meta);
  },
};

// Forwarde vers Sentry si le SDK est chargé globalement (`@sentry/nextjs` initialisé via sentry.server.config.ts).
// No-op tant que le SDK n'est pas installé / configuré (DSN manquant).
function forwardToSentry(event: string, err?: unknown, meta?: Record<string, unknown>) {
  const sentry = (globalThis as { Sentry?: { captureException?: (e: unknown, hint?: unknown) => void; captureMessage?: (m: string, ctx?: unknown) => void } }).Sentry;
  if (!sentry) return;
  try {
    if (err !== undefined && sentry.captureException) {
      sentry.captureException(err, { tags: { event }, extra: meta });
    } else if (sentry.captureMessage) {
      sentry.captureMessage(event, { level: "error", extra: meta });
    }
  } catch {
    // Ne jamais laisser l'observabilité crasher l'app
  }
}
