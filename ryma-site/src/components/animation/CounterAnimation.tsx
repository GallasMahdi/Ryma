'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useNativeInView } from '@/lib/useIntersection';

interface CounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

export function CounterAnimation({ end, suffix = '', prefix = '', duration = 1800 }: CounterProps) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useNativeInView({ threshold: 0 });
  const hasStarted = useRef(false);

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number | null = null;

    const startAnimation = () => {
      if (hasStarted.current) return;
      hasStarted.current = true;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        // Luxury easeOutQuart: 1 - (1 - progress)^4
        const ease = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.round(ease * end);

        setCount(currentVal);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };

      animationFrameId = requestAnimationFrame(animate);
    };

    if (inView) {
      startAnimation();
    } else {
      // Immediate fallback if element is already inside the initial viewport (above fold)
      const fallbackTimer = setTimeout(() => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const isVisible = rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom > 0;
          if (isVisible) {
            startAnimation();
          }
        }
      }, 100);
      return () => clearTimeout(fallbackTimer);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [inView, end, duration, ref]);

  return (
    <span ref={ref as any} className="inline-block tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}
