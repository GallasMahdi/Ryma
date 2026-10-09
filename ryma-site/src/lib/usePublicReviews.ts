'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Review } from '@/types/admin';

/** Keep public testimonials in sync with moderation, including an empty approved list. */
export function usePublicReviews(limit?: number) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats,setStats]=useState<{total:number;average:number}>({total:0,average:0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const url = limit ? `/api/reviews?limit=${limit}` : '/api/reviews';

  const refresh = useCallback(async () => {
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    try {
      const response = await fetch(url, { cache: 'no-store', signal: request.signal });
      if (!response.ok) throw new Error('Reviews unavailable');
      const data = await response.json();
      if (!Array.isArray(data.reviews)) throw new Error('Invalid reviews response');
      if (request.signal.aborted || requestRef.current !== request) return;
      setReviews(data.reviews);
      setStats(data.stats || {total:data.reviews.length,average:data.reviews.length?data.reviews.reduce((sum:number,review:Review)=>sum+review.rating,0)/data.reviews.length:0});
      setError(false);
    } catch {
      if (!request.signal.aborted && requestRef.current === request) setError(true);
    } finally {
      if (requestRef.current === request && !request.signal.aborted) {
        setLoading(false);
        requestRef.current = null;
      }
    }
  }, [url]);

  useEffect(() => {
    void refresh();
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    const interval = setInterval(refreshVisible, 60_000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [refresh]);

  return { reviews, stats, loading, error, refresh };
}
