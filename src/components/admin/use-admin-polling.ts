"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface UseAdminPollingOptions<T> {
  fetchFn: (signal: AbortSignal) => Promise<T>;
  intervalMs?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  initialData?: T | null;
}

interface UseAdminPollingReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const DEFAULT_INTERVAL_MS = 60_000;
const TIMEOUT_MS = 10_000;

export function useAdminPolling<T>({
  fetchFn,
  intervalMs = DEFAULT_INTERVAL_MS,
  enabled = true,
  onSuccess,
  onError,
  initialData = null,
}: UseAdminPollingOptions<T>): UseAdminPollingReturn<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [error, setError] = useState<string | null>(null);

  // We use the AbortController reference as a per-request identity token.
  // Comparing against it in callbacks prevents stale (superseded) fetches
  // from updating state — this also fixes the React Strict Mode double-invoke
  // race where the first mount's finally block was clearing `inFlightRef`
  // after the second mount's fetch had already started.
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFnRef = useRef(fetchFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  const pathname = usePathname();

  useEffect(() => {
    fetchFnRef.current = fetchFn;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  const executeFetch = useCallback(async () => {
    // Abort any in-flight request before starting a new one.
    // This handles Strict Mode double-invoke and debounced refreshes.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const result = await fetchFnRef.current(controller.signal);

      // Guard: a newer request has already taken over — discard this result.
      if (abortControllerRef.current !== controller) return;

      setData(result);
      setError(null);
      onSuccessRef.current?.(result);
    } catch (err) {
      // Silently discard aborted requests (timeout, unmount cleanup, or
      // Strict Mode double-invoke cancellation).
      if ((err as Error)?.name === "AbortError") return;

      // Guard: discard error if a newer request has superseded this one.
      if (abortControllerRef.current !== controller) return;

      const errorMessage = (err as Error)?.message || "Failed to fetch data";
      setError(errorMessage);
      onErrorRef.current?.(err as Error);
    } finally {
      clearTimeout(timeoutId);
      // Only update loading state if we are still the active request.
      // Without this guard the first (aborted) fetch's finally would call
      // setLoading(false) while the second fetch is mid-flight, leaving the
      // component in an empty, non-loading state until the page is refreshed.
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    void executeFetch();
  }, [executeFetch]);

  useEffect(() => {
    if (!enabled) return;

    if (data === null) {
      setLoading(true);
    }
    setError(null);

    void executeFetch();

    intervalIdRef.current = setInterval(executeFetch, intervalMs);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      // Null out the ref before aborting so the in-flight fetch's finally
      // block sees a changed ref and does not call setLoading(false).
      const controller = abortControllerRef.current;
      abortControllerRef.current = null;
      controller?.abort();
    };
  }, [enabled, intervalMs, executeFetch, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refresh };
}
