'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Preserve the calendar's space while fetching another day or week. */
export function AgendaContent({loading, loadingLabel, children}: {
  loading: boolean;
  loadingLabel: string;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [reservedHeight, setReservedHeight] = useState(320);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || loading) return;
    const measure = () => {
      const bounds = content.getBoundingClientRect();
      // Hidden dashboard tabs must not reset the reservation to an empty height.
      if (!bounds.width) return;
      const scrollArea = content.closest('main');
      const viewportBottom = scrollArea?.getBoundingClientRect().bottom ?? window.innerHeight;
      // A shorter/empty result still fills the visible space below the agenda,
      // so the browser never has to clamp the current scroll position upward.
      setReservedHeight(Math.ceil(Math.max(bounds.height, viewportBottom - bounds.top, 0)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    window.addEventListener('resize', measure);
    return () => {observer.disconnect(); window.removeEventListener('resize', measure);};
  }, [loading]);

  return <div className="relative" style={{minHeight:reservedHeight}}>
    <div ref={contentRef} inert={loading} aria-hidden={loading || undefined} className={loading ? 'opacity-0' : undefined}>
      {children}
    </div>
    {loading && <div role="status" className="absolute inset-0 flex items-start justify-center rounded-xl border border-[#E2E8F0] bg-white p-12 text-center text-sm text-[#64748B]">
      <span className="animate-pulse motion-reduce:animate-none">{loadingLabel}</span>
    </div>}
  </div>;
}
