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
    try {
      if (!window.grecaptcha) {
        resolve(null);
        return;
      }

      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(siteKey, { action });
          resolve(token);
        } catch (err) {
          console.warn('[reCAPTCHA Client Execute Warning]:', err);
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
}
