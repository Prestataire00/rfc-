// Logger central — JSON structuré en prod, lisible en dev.
// Usage : logger.info("event", { ...meta }) | logger.error("event", err, { ...meta })
// `logger.error()` forwarde automatiquement vers Sentry (sprint-2-observability).

import * as Sentry from "@sentry/nextjs";

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

// Forwarde vers Sentry. Si SENTRY_DSN n'est pas set, `Sentry.init()` désactive
// le SDK → ces appels deviennent des no-ops silencieux (pas de network call).
// Wrap try/catch : ne jamais laisser l'observabilité crasher l'app.
function forwardToSentry(event: string, err?: unknown, meta?: Record<string, unknown>) {
  try {
    if (err !== undefined) {
      Sentry.captureException(err, { tags: { event }, extra: meta });
    } else {
      Sentry.captureMessage(event, { level: "error", extra: meta });
    }
  } catch {
    // Ne jamais laisser l'observabilité crasher l'app
  }
}
