/**
 * Structured Logging Utility
 * 
 * Implements JSON-formatted logging with correlation IDs, user context, and timestamps.
 * All log statements include tracing information for debugging.
 * 
 * Validates: Requirements 20.5
 */

import { type RequestContext } from './correlation';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  correlationId?: string;
  causationId?: string;
  userId?: string;
  timestamp: string;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger class with correlation ID support
 */
export class Logger {
  private context?: RequestContext;

  constructor(context?: RequestContext) {
    this.context = context;
  }

  /**
   * Create a child logger with updated context
   */
  child(context: RequestContext): Logger {
    return new Logger(context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log('debug', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, any>): void {
    this.log('info', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log('warn', message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, data?: Record<string, any>): void {
    const errorData = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.log('error', message, data, errorData);
  }

  /**
   * Log a critical error message
   */
  critical(message: string, error?: Error, data?: Record<string, any>): void {
    const errorData = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.log('critical', message, data, errorData);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>,
    error?: { name: string; message: string; stack?: string }
  ): void {
    const entry: LogEntry = {
      level,
      message,
      correlationId: this.context?.correlationId,
      causationId: this.context?.causationId,
      userId: this.context?.userId,
      timestamp: new Date().toISOString(),
      data,
      error,
    };

    // Output as JSON for structured logging
    const logString = JSON.stringify(entry);

    // Route to appropriate console method
    switch (level) {
      case 'debug':
        console.debug(logString);
        break;
      case 'info':
        console.info(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
      case 'critical':
        console.error(logString);
        break;
    }
  }
}

/**
 * Create a logger instance with optional context
 */
export function createLogger(context?: RequestContext): Logger {
  return new Logger(context);
}

/**
 * Global logger instance (without context)
 * Use createLogger(context) for context-aware logging
 */
export const logger = new Logger();

/**
 * Helper function for backward compatibility with existing console.log calls
 * Formats as structured log
 */
export function log(
  level: LogLevel,
  message: string,
  context?: RequestContext,
  data?: Record<string, any>
): void {
  const logger = new Logger(context);
  
  switch (level) {
    case 'debug':
      logger.debug(message, data);
      break;
    case 'info':
      logger.info(message, data);
      break;
    case 'warn':
      logger.warn(message, data);
      break;
    case 'error':
      logger.error(message, undefined, data);
      break;
    case 'critical':
      logger.critical(message, undefined, data);
      break;
  }
}
