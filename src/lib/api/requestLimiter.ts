import { apiClient } from "@/lib/api/client";

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Aborted", "AbortError");
  }
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

/**
 * Wraps a shared promise so an individual caller's AbortSignal cancels only that
 * caller's await without cancelling the underlying request for other subscribers.
 * Calls `onAbort` if the caller aborts before settlement.
 */
function awaitWithSignal<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  onAbort?: () => void
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    onAbort?.();
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const handleAbort = () => {
      if (settled) return;
      settled = true;
      onAbort?.();
      reject(createAbortError());
    };

    signal.addEventListener("abort", handleAbort, { once: true });

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", handleAbort);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", handleAbort);
        reject(error);
      }
    );
  });
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface InFlightEntry<T> {
  promise: Promise<T>;
  subscribers: number;
  controller: AbortController;
}

/**
 * Bounded in-memory TTL cache with in-flight request deduplication.
 * Automatically resets if `globalThis.fetch` or `apiClient.get` changes (e.g. in unit tests).
 */
export class TtlDedupeCache<T> {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private cache = new Map<string, CacheEntry<T>>();
  private inFlight = new Map<string, InFlightEntry<T>>();
  private lastFetchRef: typeof globalThis.fetch | undefined;
  private lastApiGetRef: typeof apiClient.get | undefined;

  constructor(options: { ttlMs: number; maxEntries?: number }) {
    this.ttlMs = Math.max(0, options.ttlMs);
    this.maxEntries = Math.max(1, options.maxEntries ?? 100);
  }

  private ensureEnvironmentSync(): void {
    const currentFetch = typeof globalThis !== "undefined" ? globalThis.fetch : undefined;
    const currentApiGet = apiClient.get;
    if (this.lastFetchRef !== currentFetch || this.lastApiGetRef !== currentApiGet) {
      this.cache.clear();
      this.inFlight.clear();
      this.lastFetchRef = currentFetch;
      this.lastApiGetRef = currentApiGet;
    }
  }

  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  private setCached(key: string, value: T): void {
    if (this.ttlMs <= 0) return;

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  async getOrFetch(
    key: string,
    fetcher: (internalSignal: AbortSignal) => Promise<T>,
    signal?: AbortSignal
  ): Promise<T> {
    if (signal?.aborted) {
      throw createAbortError();
    }

    this.ensureEnvironmentSync();

    const cached = this.cache.get(key);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.value;
      }
      this.cache.delete(key);
    }

    let entry = this.inFlight.get(key);
    if (!entry) {
      const controller = new AbortController();
      const promise = fetcher(controller.signal)
        .then((result) => {
          this.setCached(key, result);
          return result;
        })
        .finally(() => {
          if (this.inFlight.get(key)?.promise === promise) {
            this.inFlight.delete(key);
          }
        });

      entry = {
        promise,
        subscribers: 0,
        controller,
      };
      this.inFlight.set(key, entry);
    }

    entry.subscribers += 1;
    let released = false;

    const releaseSubscriber = (shouldAbortIfLast: boolean) => {
      if (released) return;
      released = true;
      entry!.subscribers = Math.max(0, entry!.subscribers - 1);
      if (shouldAbortIfLast && entry!.subscribers === 0) {
        entry!.controller.abort();
        if (this.inFlight.get(key) === entry) {
          this.inFlight.delete(key);
        }
      }
    };

    try {
      const result = await awaitWithSignal(entry.promise, signal, () => {
        releaseSubscriber(true);
      });
      releaseSubscriber(false);
      return result;
    } catch (error) {
      releaseSubscriber(false);
      throw error;
    }
  }
}

/**
 * Executes async work over `items` with a strict upper bound on concurrency.
 * Stops launching new tasks immediately if `signal` aborts.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal
): Promise<R[]> {
  if (items.length === 0) return [];
  if (signal?.aborted) {
    throw createAbortError();
  }

  const results = new Array<R>(items.length);
  const workerCount = Math.max(1, Math.min(Math.floor(concurrency) || 1, items.length));
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      if (signal?.aborted) {
        throw createAbortError();
      }
      const index = nextIndex++;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}
