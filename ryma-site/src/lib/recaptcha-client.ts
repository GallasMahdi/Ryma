'use client';

/**
 * Google reCAPTCHA v3 Client Helper
 * Safely executes invisible reCAPTCHA in the browser.
 */

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export async function getRecaptchaToken(action: string = 'booking'): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey || siteKey.trim() === '') {
    return null;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return new Promise((resolve) => {
    let settled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearTimeout(retryTimer);
      resolve(token);
    };
    // Bound both script loading and execution so a blocked script cannot hang the form.
    const timeout = setTimeout(() => finish(null), 12_000);
    const executeWhenReady = () => {
      if (settled) return;
      const recaptcha = window.grecaptcha;
      if (!recaptcha) {
        retryTimer = setTimeout(executeWhenReady, 100);
        return;
      }
      try {
        recaptcha.ready(async () => {
          if (settled) return;
          try {
            const token = await recaptcha.execute(siteKey.trim(), { action });
            finish(token || null);
          } catch {
            finish(null);
          }
        });
      } catch {
        finish(null);
      }
    };
    executeWhenReady();
  });
}
