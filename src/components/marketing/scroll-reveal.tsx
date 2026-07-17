"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** SSR-safe layout effect — avoids the React server-render warning. */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealState = "hidden" | "instant" | "revealed";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Transition delay in ms, for staggering sibling reveals. */
  delay?: number;
}

/**
 * ScrollReveal — soft one-shot entrance for below-fold marketing sections.
 * Fades + lifts content into place the first time it scrolls into view.
 * Content already inside the initial viewport is shown immediately with no
 * animation, so nothing above the fold ever flashes hidden.
 * Reduced-motion users are covered by the sitewide kill-switch in globals.css.
 */
export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>("hidden");

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Already visible on load — or already scrolled past before hydration
    // (fast scroll on a slow connection) — reveal instantly, before first paint.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setState("instant");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("revealed");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        state === "hidden" && "translate-y-4 opacity-0",
        state === "revealed" && "translate-y-0 opacity-100 transition-all duration-700 ease-out",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
