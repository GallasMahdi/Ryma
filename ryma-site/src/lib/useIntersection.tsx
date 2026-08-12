"use client";

import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions extends IntersectionObserverInit {
  once?: boolean;
}

export function useNativeInView({ once = true, root = null, rootMargin = '0px', threshold = 0 }: UseInViewOptions = {}) {
  const observeOnce = once;
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (observeOnce) observer.disconnect();
          } else if (!observeOnce) {
            setInView(false);
          }
        });
      },
      { root, rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [observeOnce, root, rootMargin, threshold]);

  return { ref, inView };
}