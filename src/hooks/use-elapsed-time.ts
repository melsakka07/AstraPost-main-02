import { useState, useEffect } from "react";

/**
 * Counts up in seconds while `isRunning` is true.
 * Resets to 0 when `isRunning` becomes false.
 */
export function useElapsedTime(isRunning: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      // Use setTimeout to avoid calling setState directly in the effect body
      const t = setTimeout(() => setElapsed(0), 0);
      return () => clearTimeout(t);
    }
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  return elapsed;
}
