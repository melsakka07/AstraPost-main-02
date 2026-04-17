"use client";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  fields?: Record<string, unknown>;
}

/**
 * Client-side error reporting service.
 * In development: logs to console for debugging.
 * In production: sends errors to /api/log endpoint for server-side tracking.
 *
 * Usage:
 *   clientLogger.error("Failed to fetch", { error: err.message });
 *   clientLogger.warn("Deprecation warning", { feature: "old-api" });
 */
export const clientLogger = {
  debug: (message: string, fields?: Record<string, unknown>) => {
    logInternal("debug", message, fields);
  },

  info: (message: string, fields?: Record<string, unknown>) => {
    logInternal("info", message, fields);
  },

  warn: (message: string, fields?: Record<string, unknown>) => {
    logInternal("warn", message, fields);
  },

  error: (message: string, fields?: Record<string, unknown>) => {
    logInternal("error", message, fields);
  },
};

function logInternal(level: LogLevel, message: string, fields?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const payload: LogPayload = {
    level,
    message,
    timestamp,
    ...(fields && { fields }),
  };

  // Always log to console in development
  if (process.env.NODE_ENV === "development") {
    const consoleMethod =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "info"
            ? console.warn
            : console.warn;

    consoleMethod(`[${timestamp}] [${level.toUpperCase()}] ${message}`, fields ?? {});
  }

  // Always send to backend (development and production)
  sendToBackend(payload);
}

function sendToBackend(payload: LogPayload) {
  // Use beacon API if available (survives page unload), fall back to fetch
  const json = JSON.stringify(payload);

  // Try sendBeacon first — it's reliable for page unload scenarios
  if (navigator.sendBeacon?.("/api/log", json)) {
    return;
  }

  // Fall back to fetch without awaiting — don't let logging failures break the app
  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
    // Use keepalive to ensure request completes even if page unloads
    keepalive: true,
  }).catch(() => {
    // Silently fail — logging errors should never break the app
  });
}
