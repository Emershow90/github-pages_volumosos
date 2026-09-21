/**
 * executionGuard.ts
 * 
 * Guards against:
 * 1. Infinite loops & runaway recursive calls
 * 2. Overlapping duplicate background jobs / intervals
 * 3. Rapid redundant external API calls (request deduplication + TTL caching)
 */

import { logger } from './telemetryLogger';

// Mutex locks for background jobs to prevent stacking calls
const activeJobLocks = new Set<string>();

// In-memory TTL cache for external or computational calls
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const requestCache = new Map<string, CacheEntry<unknown>>();

// Call in-flight promises to deduplicate identical concurrent calls
const inFlightRequests = new Map<string, Promise<unknown>>();

export class ExecutionGuard {
  /**
   * Guard for recursive execution depth to prevent stack overflows
   */
  public static guardRecursion(functionName: string, currentDepth: number, maxDepth = 40): void {
    if (currentDepth > maxDepth) {
      const msg = `[ExecutionGuard] Recursion depth limit reached for "${functionName}" (depth: ${currentDepth}, max: ${maxDepth}). Execution halted to protect runtime.`;
      logger.error('ExecutionGuard', 'RECURSION_LIMIT', msg, { functionName, currentDepth, maxDepth });
      throw new Error(msg);
    }
  }

  /**
   * Guard for loops to prevent infinite CPU freeze
   */
  public static createLoopCounter(loopName: string, maxIterations = 50000) {
    let count = 0;
    return {
      step: () => {
        count++;
        if (count > maxIterations) {
          const msg = `[ExecutionGuard] Loop iteration limit exceeded in "${loopName}" (iterations: ${count}, max: ${maxIterations}).`;
          logger.error('ExecutionGuard', 'LOOP_LIMIT', msg, { loopName, iterations: count, maxIterations });
          throw new Error(msg);
        }
        return count;
      }
    };
  }

  /**
   * Run a background job exclusively (Prevents duplicate execution if a previous job is still running)
   */
  public static async runExclusiveJob<T>(jobKey: string, fn: () => Promise<T>, timeoutMs = 30000): Promise<T | null> {
    if (activeJobLocks.has(jobKey)) {
      logger.warn('ExecutionGuard', 'JOB_SKIPPED', `Job "${jobKey}" is already running. Skipping duplicate execution to save bandwidth and compute.`);
      return null;
    }

    activeJobLocks.add(jobKey);
    logger.trackJobStart(jobKey);

    const timer = setTimeout(() => {
      if (activeJobLocks.has(jobKey)) {
        activeJobLocks.delete(jobKey);
        logger.warn('ExecutionGuard', 'JOB_TIMEOUT', `Job "${jobKey}" lock timed out after ${timeoutMs}ms.`);
      }
    }, timeoutMs);

    try {
      const result = await fn();
      return result;
    } catch (err) {
      logger.error('ExecutionGuard', 'JOB_ERROR', `Error executing exclusive job "${jobKey}"`, { error: String(err) });
      throw err;
    } finally {
      clearTimeout(timer);
      activeJobLocks.delete(jobKey);
      logger.trackJobEnd(jobKey);
    }
  }

  /**
   * Cached or in-flight deduplicated execution with TTL (Time to live in ms)
   */
  public static async withCacheAndDeduplication<T>(
    cacheKey: string,
    ttlMs: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();

    // Check valid cache
    const cached = requestCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // Check if same request is already in flight (deduplicate simultaneous requests)
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<T>;
    }

    const promise = (async () => {
      try {
        const result = await fetchFn();
        requestCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + ttlMs
        });
        return result;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, promise);
    return promise;
  }

  /**
   * Clear expired cache entries
   */
  public static cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of requestCache.entries()) {
      if (entry.expiresAt <= now) {
        requestCache.delete(key);
      }
    }
  }
}
