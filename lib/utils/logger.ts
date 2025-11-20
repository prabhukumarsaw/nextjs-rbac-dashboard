/**
 * Structured Logging Utility
 * Provides consistent logging format for production monitoring
 * Replace console.log/error with this for better observability
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

/**
 * Format log entry for structured logging
 */
function formatLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }),
  };
}

/**
 * Log info message
 */
export function logInfo(message: string, context?: Record<string, any>) {
  const entry = formatLog("info", message, context);
  console.log(JSON.stringify(entry));
}

/**
 * Log warning message
 */
export function logWarn(message: string, context?: Record<string, any>) {
  const entry = formatLog("warn", message, context);
  console.warn(JSON.stringify(entry));
}

/**
 * Log error message
 */
export function logError(message: string, error?: Error, context?: Record<string, any>) {
  const entry = formatLog("error", message, context, error);
  console.error(JSON.stringify(entry));
}

/**
 * Log debug message (only in development)
 */
export function logDebug(message: string, context?: Record<string, any>) {
  if (process.env.NODE_ENV === "development") {
    const entry = formatLog("debug", message, context);
    console.debug(JSON.stringify(entry));
  }
}

