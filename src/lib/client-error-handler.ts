import * as Sentry from "@sentry/nextjs";

/**
 * Wrapper for client-side error reporting.
 * Use instead of console.error to automatically send to Sentry.
 */
export function reportError(error: Error | unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    contexts: {
      error_context: context || {},
    },
  });

  // Also log locally
  if (error instanceof Error) {
    console.error(error.message, error.stack);
  } else {
    console.error(error);
  }
}

/**
 * Wrapper for important events that should be tracked.
 */
export function reportEvent(
  name: string,
  level: "info" | "warning" | "error" | "fatal" | "debug" | "log" = "info",
  data?: Record<string, unknown>
) {
  Sentry.captureMessage(name, {
    level,
    contexts: {
      event_context: data || {},
    },
  });
}
