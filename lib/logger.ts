import pino from 'pino';
import { randomUUID } from 'crypto';

/**
 * High-performance structured logger using Pino.
 * Provides JSON logging with automatic serialization and redaction.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  event?: string;
  correlationId?: string;
  [key: string]: unknown;
}

// Development configuration with pretty printing
const developmentTransport = process.env.LOG_TO_FILE 
  ? {
      // When logging to file, use multiple targets
      transport: {
        targets: [
          {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'pid,hostname',
              translateTime: 'yyyy-mm-dd HH:MM:ss',
              singleLine: false,
              destination: 1, // stdout
            },
          },
          {
            target: 'pino/file',
            options: { 
              destination: process.env.LOG_TO_FILE,
              mkdir: true,
            },
          },
        ],
      },
    }
  : {
      // Single target when not logging to file (allows formatters)
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          singleLine: false,
        },
      },
    };

// Base Pino configuration
const baseConfig = {
  level: process.env.PINO_LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'cpf',
      'cnpj',
      'creditCard',
      'bankAccount',
    ],
    censor: '[REDACTED]',
  },
  // Add custom serializers for common objects
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

// Configuration with formatters (only for single target)
const pinoConfig = process.env.LOG_TO_FILE 
  ? baseConfig  // No formatters when using multiple targets
  : {
      ...baseConfig,
      formatters: {
        level: (label: string) => {
          return { level: label.toUpperCase() };
        },
        bindings: (bindings: pino.Bindings) => {
          return {
            pid: bindings.pid,
            host: bindings.hostname,
            node_version: process.version,
          };
        },
      },
    };

// Production configuration with file logging if enabled
const productionTransport = process.env.LOG_TO_FILE 
  ? {
      transport: {
        target: 'pino/file',
        options: { 
          destination: process.env.LOG_TO_FILE,
          mkdir: true,
        },
      },
    }
  : {};

// Merge configurations based on environment
const finalConfig = {
  ...pinoConfig,
  ...(process.env.NODE_ENV === 'development' ? developmentTransport : productionTransport),
};

// Create the main Pino logger instance
const pinoLogger = pino(finalConfig);

// Wrapper to maintain backward compatibility with existing code
export const logger = {
  debug: (message: string, context?: LogContext) => {
    pinoLogger.debug(context || {}, message);
  },
  info: (message: string, context?: LogContext) => {
    pinoLogger.info(context || {}, message);
  },
  warn: (message: string, context?: LogContext) => {
    pinoLogger.warn(context || {}, message);
  },
  error: (message: string, context?: LogContext & { error?: unknown }) => {
    const { error, ...rest } = context ?? {};
    const logContext: Record<string, unknown> = { ...rest };
    
    if (error instanceof Error) {
      logContext.error = error;
    } else if (typeof error !== 'undefined') {
      logContext.errorData = error;
    }
    
    pinoLogger.error(logContext, message);
  },
};

/**
 * Create a child logger with a fixed context (e.g., correlationId/importBatchId)
 * Using Pino's native child logger for better performance
 */
export function childLogger(fixed: LogContext) {
  const child = pinoLogger.child(fixed);
  
  return {
    debug: (message: string, ctx?: LogContext) =>
      child.debug(ctx || {}, message),
    info: (message: string, ctx?: LogContext) =>
      child.info(ctx || {}, message),
    warn: (message: string, ctx?: LogContext) =>
      child.warn(ctx || {}, message),
    error: (message: string, ctx?: LogContext & { error?: unknown }) => {
      const { error, ...rest } = ctx ?? {};
      const logContext: Record<string, unknown> = { ...rest };
      
      if (error instanceof Error) {
        logContext.error = error;
      } else if (typeof error !== 'undefined') {
        logContext.errorData = error;
      }
      
      child.error(logContext, message);
    },
  };
}

// Helper functions for specific use cases
export function createRequestLogger(metadata?: Record<string, unknown>) {
  return pinoLogger.child({
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

export function createActionLogger(actionName: string, metadata?: Record<string, unknown>) {
  return pinoLogger.child({
    action: actionName,
    actionId: randomUUID(),
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

export function createDatabaseLogger(operation: string, metadata?: Record<string, unknown>) {
  return pinoLogger.child({
    component: 'database',
    operation,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

// Export the raw Pino instance for advanced usage
export { pinoLogger };