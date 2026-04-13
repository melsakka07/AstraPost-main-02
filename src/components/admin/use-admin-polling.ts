"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface UseAdminPollingOptions<T> {
  fetchFn: (signal: AbortSignal) => Promise<T>;
  intervalMs?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
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
}: UseAdminPollingOptions<T>): UseAdminPollingReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
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
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const result = await fetchFnRef.current(controller.signal);
      if (!inFlightRef.current) return;

      setData(result);
      setError(null);
      onSuccessRef.current?.(result);
    } catch (err) {
      if (!inFlightRef.current) return;

      if ((err as Error)?.name === "AbortError") return;

      const errorMessage = (err as Error)?.message || "Failed to fetch data";
      setError(errorMessage);
      onErrorRef.current?.(err as Error);
    } finally {
      clearTimeout(timeoutId);
      inFlightRef.current = false;
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    inFlightRef.current = false;
    void executeFetch();
  }, [executeFetch]);

  useEffect(() => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    void executeFetch();

    intervalIdRef.current = setInterval(executeFetch, intervalMs);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      inFlightRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, intervalMs, executeFetch, pathname]);

  return { data, loading, error, refresh };
}
