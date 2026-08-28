/**
 * telemetryLogger.ts
 * 
 * Centralized Structured Logging & Elasticity Monitoring.
 * Tracks application performance, latencies, error rates, and resource usage
 * across both frontend and backend operations.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  METRIC = 'METRIC',
  AUDIT = 'AUDIT'
}

export interface StructuredLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  action: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  traceId?: string;
  userId?: string;
}

export interface SystemMetrics {
  totalRequests: number;
  totalErrors: number;
  averageLatencyMs: number;
  activeBackgroundJobs: number;
  lastBurstTimestamp?: string;
  uptimeSeconds: number;
}

class TelemetryLogger {
  private logs: StructuredLogEntry[] = [];
  private readonly maxLogs = 500;
  private startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;
  private totalLatencyMs = 0;
  private activeJobs = new Set<string>();

  /**
   * Log an event with structured metadata
   */
  public log(
    level: LogLevel,
    module: string,
    action: string,
    message: string,
    metadata?: Record<string, unknown>,
    durationMs?: number
  ): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      module,
      action,
      message,
      durationMs,
      metadata
    };

    // Keep sliding window buffer of logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (level === LogLevel.ERROR) {
      this.errorCount++;
      console.error(`[${level}][${module}::${action}] ${message}`, metadata || '');
    } else if (level === LogLevel.WARN) {
      console.warn(`[${level}][${module}::${action}] ${message}`, metadata || '');
    } else if (level === LogLevel.DEBUG) {
      if (typeof window !== 'undefined' && (window as unknown as { __DEBUG_LOGS__?: boolean }).__DEBUG_LOGS__) {
        console.debug(`[${level}][${module}::${action}] ${message}`, metadata || '');
      }
    } else {
      console.log(`[${level}][${module}::${action}] ${message}`, metadata || '');
    }

    return entry;
  }

  public info(module: string, action: string, message: string, metadata?: Record<string, unknown>) {
    return this.log(LogLevel.INFO, module, action, message, metadata);
  }

  public warn(module: string, action: string, message: string, metadata?: Record<string, unknown>) {
    return this.log(LogLevel.WARN, module, action, message, metadata);
  }

  public error(module: string, action: string, message: string, metadata?: Record<string, unknown>) {
    return this.log(LogLevel.ERROR, module, action, message, metadata);
  }

  public metric(module: string, action: string, durationMs: number, metadata?: Record<string, unknown>) {
    this.requestCount++;
    this.totalLatencyMs += durationMs;
    return this.log(LogLevel.METRIC, module, action, `Execution completed in ${durationMs}ms`, metadata, durationMs);
  }

  /**
   * Start a high-resolution execution timer
   */
  public startTimer(module: string, action: string, metadata?: Record<string, unknown>) {
    const start = performance.now();
    const traceId = `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    return {
      traceId,
      end: (extraMeta?: Record<string, unknown>) => {
        const duration = Math.round(performance.now() - start);
        const mergedMeta = { ...metadata, ...extraMeta, traceId };
        this.metric(module, action, duration, mergedMeta);
        return duration;
      },
      endWithError: (err: unknown, extraMeta?: Record<string, unknown>) => {
        const duration = Math.round(performance.now() - start);
        const errorMsg = err instanceof Error ? err.message : String(err);
        const mergedMeta = { ...metadata, ...extraMeta, traceId, error: errorMsg };
        this.log(LogLevel.ERROR, module, action, `Failed after ${duration}ms: ${errorMsg}`, mergedMeta, duration);
        return duration;
      }
    };
  }

  /**
   * Track active background job
   */
  public trackJobStart(jobName: string) {
    this.activeJobs.add(jobName);
    this.info('BackgroundJob', 'START', `Job started: ${jobName}`);
  }

  public trackJobEnd(jobName: string) {
    this.activeJobs.delete(jobName);
    this.info('BackgroundJob', 'COMPLETE', `Job completed: ${jobName}`);
  }

  /**
   * Get current aggregated metrics
   */
  public getMetrics(): SystemMetrics {
    const uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);
    const avgLatency = this.requestCount > 0 ? Math.round(this.totalLatencyMs / this.requestCount) : 0;

    return {
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      averageLatencyMs: avgLatency,
      activeBackgroundJobs: this.activeJobs.size,
      uptimeSeconds
    };
  }

  public getRecentLogs(limit = 50, level?: LogLevel): StructuredLogEntry[] {
    let list = this.logs;
    if (level) {
      list = list.filter(l => l.level === level);
    }
    return list.slice(-limit);
  }
}

export const logger = new TelemetryLogger();
