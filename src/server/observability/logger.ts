import "server-only";

type LogContext = Record<string, string | number | boolean | null | undefined>;
type LogLevel = "info" | "warn" | "error";

function payloadFor(level: LogLevel, message: string, context: LogContext = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    service: "reroute-web",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    message,
    ...context,
  };
}

function writeConsole(level: LogLevel, payload: ReturnType<typeof payloadFor>) {
  const serialized = JSON.stringify(payload);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.info(serialized);
}

async function deliver(payload: ReturnType<typeof payloadFor>) {
  const drainUrl = process.env.LOG_DRAIN_URL?.trim();
  if (!drainUrl) return;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.LOG_DRAIN_TOKEN) headers.Authorization = `Bearer ${process.env.LOG_DRAIN_TOKEN}`;
    const response = await fetch(drainUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: "warn", message: "log_drain_rejected", status: response.status }));
  } catch (error) {
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: "warn", message: "log_drain_delivery_failed", errorName: error instanceof Error ? error.name : "UnknownError" }));
  }
}

async function write(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = payloadFor(level, message, context);
  writeConsole(level, payload);
  await deliver(payload);
}

export async function writeLog(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = payloadFor(level, message, context);
  writeConsole(level, payload);
  await deliver(payload);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
