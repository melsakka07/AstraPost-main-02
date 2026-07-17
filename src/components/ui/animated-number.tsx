"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: (n: number) => string;
}

const DURATION_MS = 700;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Renders a number that counts up from 0 to `value` on mount (~700ms,
 * ease-out). Server and first client render both show the final formatted
 * value, so there is no hydration mismatch; the count-up only starts after
 * mount. Respects `prefers-reduced-motion` by skipping the animation.
 */
export function AnimatedNumber({ value, className, format }: AnimatedNumberProps) {
  const locale = useLocale();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const settle = () => {
      fromRef.current = value;
      setDisplay(value);
    };
    // JS-driven animation is not covered by the CSS reduced-motion
    // kill-switch; the hook's state also lags one render on mount, so query
    // the media directly before scheduling the first frame.
    if (prefersReducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle();
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      const current = from + (value - from) * easeOutCubic(t);
      setDisplay(Number.isInteger(value) ? Math.round(current) : current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, prefersReducedMotion]);

  return (
    <span className={cn("tabular-nums", className)}>
      {format ? format(display) : display.toLocaleString(locale)}
    </span>
  );
}
