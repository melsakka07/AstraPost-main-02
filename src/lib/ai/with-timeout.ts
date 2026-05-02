// ============================================================================
// Promise timeout wrapper for AI model calls.
//
// Usage:
//   const result = await withTimeout(generateObject({ model, ... }), 30_000);
//
// Default: 45 000 ms (45 seconds).
// ============================================================================

export async function withTimeout<T>(promise: Promise<T>, ms = 45_000): Promise<T> {
  const signal = AbortSignal.timeout(ms);

  return new Promise<T>((resolve, reject) => {
    const onAbort = () =>
      reject(new DOMException(`Operation timed out after ${ms}ms`, "TimeoutError"));

    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}
