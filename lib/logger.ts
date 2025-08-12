/**
 * Minimal structured logger for server-side usage.
 * Provides consistent JSON-ish logs with level, message, and optional context.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  event?: string;
  correlationId?: string;
  [key: string]: unknown;
}

function nowISO() {
  try {
    return new Date().toISOString();
  } catch {
    return '';
  }
}

function baseLog(level: LogLevel, message: string, context?: LogContext) {
  const payload = {
    ts: nowISO(),
    level,
    message,
    ...((context ?? {}) as object),
  };

  // Use console methods to preserve dev ergonomics
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(payload);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(payload);
  } else if (level === 'info') {
    // eslint-disable-next-line no-console
    console.info(payload);
  } else {
    // eslint-disable-next-line no-console
    console.debug(payload);
  }

  return payload;
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    baseLog('debug', message, context),
  info: (message: string, context?: LogContext) =>
    baseLog('info', message, context),
  warn: (message: string, context?: LogContext) =>
    baseLog('warn', message, context),
  error: (message: string, context?: LogContext & { error?: unknown }) => {
    const { error, ...rest } = context ?? {};
    const enrich: Record<string, unknown> = { ...rest };

    if (error instanceof Error) {
      enrich.errorName = error.name;
      enrich.errorMessage = error.message;
      enrich.errorStack = error.stack;
    } else if (typeof error !== 'undefined') {
      // Preserve non-Error error payloads for debugging without using any
      enrich.error = error;
    }

    return baseLog('error', message, enrich as LogContext);
  },
};

/**
 * Create a child logger with a fixed context (e.g., correlationId/importBatchId)
 */
export function childLogger(fixed: LogContext) {
  return {
    debug: (message: string, ctx?: LogContext) =>
      logger.debug(message, { ...fixed, ...ctx }),
    info: (message: string, ctx?: LogContext) =>
      logger.info(message, { ...fixed, ...ctx }),
    warn: (message: string, ctx?: LogContext) =>
      logger.warn(message, { ...fixed, ...ctx }),
    error: (message: string, ctx?: LogContext & { error?: unknown }) =>
      logger.error(message, { ...fixed, ...ctx }),
  };
}
