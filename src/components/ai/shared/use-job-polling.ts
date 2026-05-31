"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Constants ──────────────────────────────────────────────────────────

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_POLL_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_CONSECUTIVE_FAILURES = 5;
const DEFAULT_MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ── Types ──────────────────────────────────────────────────────────────

interface UseJobPollingOptions {
  jobId: string | null;
  /** Base endpoint path (e.g. "/api/ai/youtube-to-thread"). Job ID is appended automatically. */
  pollEndpoint: string;
  onReady: (data: Record<string, unknown>, finalElapsedSeconds: number) => void;
  onFailed: (error: string, errorCode?: string) => void;
  onStatusChange: (status: string) => void;
  /** Whether the caller considers the job in a pollable progress phase */
  isProgressPhase: boolean;
  pollingIntervalMs?: number;
  pollingTimeoutMs?: number;
  maxPollDurationMs?: number;
  maxConsecutiveFailures?: number;
}

interface UseJobPollingResult {
  elapsedSeconds: number;
  connectionIssue: boolean;
}

// ── Hook ───────────────────────────────────────────────────────────────

/**
 * Shared polling hook for AI job status (YouTube-to-thread, PDF-to-thread, etc.).
 *
 * Follows the canonical AbortController polling pattern from
 * `src/components/queue/queue-realtime-listener.tsx`:
 * - abortRef (cancels in-flight before new poll) + 8s hard timeout + cleanup abort
 * - Jitter (+/-500ms)
 * - 5-min max duration cutoff
 * - Consecutive failure counter with connection-issue flag
 * - Elapsed-time timer
 */
export function useJobPolling({
  jobId,
  pollEndpoint,
  onReady,
  onFailed,
  onStatusChange,
  isProgressPhase,
  pollingIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  pollingTimeoutMs = DEFAULT_POLL_TIMEOUT_MS,
  maxPollDurationMs = DEFAULT_MAX_POLL_DURATION_MS,
  maxConsecutiveFailures = DEFAULT_MAX_CONSECUTIVE_FAILURES,
}: UseJobPollingOptions): UseJobPollingResult {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [connectionIssue, setConnectionIssue] = useState(false);

  // Ref to hold the latest jobId for the poller closure
  const jobIdRef = useRef(jobId);
  jobIdRef.current = jobId;

  // Ref to hold the latest callbacks (prevents unnecessary effect re-runs)
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  // Poll resilience refs
  const retryCountRef = useRef(0);
  const pollStartTimeRef = useRef(0);

  // Elapsed timer refs
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedSecondsRef = useRef(0);

  // ── Elapsed timer ──────────────────────────────────────────────────

  const startElapsedTimer = useCallback(() => {
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        elapsedSecondsRef.current = next;
        return next;
      });
    }, 1000);
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      stopElapsedTimer();
    };
  }, [stopElapsedTimer]);

  // ── Polling (hard rule #10: AbortController + 8s timeout) ──────────

  useEffect(() => {
    if (!isProgressPhase) return;

    const abortRef = { current: null as AbortController | null };
    let active = true;
    retryCountRef.current = 0;
    pollStartTimeRef.current = Date.now();
    setConnectionIssue(false);
    startElapsedTimer();

    const tick = async () => {
      const currentJobId = jobIdRef.current;
      if (!currentJobId || !active) return;

      // Max-wait timeout check
      if (Date.now() - pollStartTimeRef.current > maxPollDurationMs) {
        stopElapsedTimer();
        onFailedRef.current("Polling timed out", "POLLING_TIMEOUT");
        return;
      }

      // Abort any in-flight request before starting a new one
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const timeoutId = setTimeout(() => ac.abort(), pollingTimeoutMs);

      try {
        const res = await fetch(`${pollEndpoint}/${currentJobId}`, {
          signal: ac.signal,
        });

        if (!active) return;

        if (!res.ok) {
          retryCountRef.current += 1;
          if (retryCountRef.current >= maxConsecutiveFailures) {
            setConnectionIssue(true);
          }
          return;
        }

        // Success — reset failure counter
        retryCountRef.current = 0;
        setConnectionIssue(false);

        const data = await res.json();

        if (!active) return;

        const pollStatus = data.status as string;

        if (pollStatus === "ready") {
          stopElapsedTimer();
          onReadyRef.current(data, elapsedSecondsRef.current);
        } else if (pollStatus === "failed") {
          stopElapsedTimer();
          onFailedRef.current(
            (data.error as string) ?? "Generation failed",
            (data.errorCode as string) ?? undefined
          );
        } else {
          onStatusChangeRef.current(pollStatus);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof Error && err.name !== "AbortError") {
          retryCountRef.current += 1;
          if (retryCountRef.current >= maxConsecutiveFailures) {
            setConnectionIssue(true);
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let scheduleTimeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const jitter = (Math.random() - 0.5) * 1000; // +/-500ms
      scheduleTimeoutId = setTimeout(() => {
        void tick().finally(() => {
          if (active) scheduleNext();
        });
      }, pollingIntervalMs + jitter);
    };

    scheduleNext();

    return () => {
      active = false;
      clearTimeout(scheduleTimeoutId);
      abortRef.current?.abort();
    };
  }, [
    isProgressPhase,
    pollEndpoint,
    pollingIntervalMs,
    pollingTimeoutMs,
    maxPollDurationMs,
    maxConsecutiveFailures,
    startElapsedTimer,
    stopElapsedTimer,
  ]);

  return { elapsedSeconds, connectionIssue };
}
