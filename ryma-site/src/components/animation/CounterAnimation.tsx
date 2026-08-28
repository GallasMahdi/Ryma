'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

/**
 * CounterAnimation — enterprise-grade, always-fires counter.
 *
 * Design decisions:
 * - No IntersectionObserver: the stats ribbon lives above the fold in the Hero,
 *   so an IO-based trigger is unreliable after SSR hydration. We start immediately
 *   on mount via a zero-timeout to let React finish painting, then kick off RAF.
 * - easeOutExpo: numbers rush up fast and settle elegantly — premium feel.
 * - `started` ref guards against double-fire in Strict Mode double-invocation.
 * - Cleanup cancels the RAF so there are no memory leaks on unmount.
 */
export function CounterAnimation({
  end,
  suffix = '',
  prefix = '',
  duration = 1400,
}: CounterProps) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // Guard: only start once per mount (handles React Strict Mode double-call)
    if (startedRef.current) return;
    startedRef.current = true;

    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutExpo: 1 - 2^(-10 * progress)
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const value = Math.round(ease * end);
      setCount(value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCount(end); // guarantee exact final value
        rafRef.current = null;
      }
    };

    // Defer one tick so the component is fully painted before we start
    const timerId = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, 0);

    return () => {
      clearTimeout(timerId);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Reset so the animation can restart if the component re-mounts
      startedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, duration]);

  return (
    <span className="inline-block tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}
