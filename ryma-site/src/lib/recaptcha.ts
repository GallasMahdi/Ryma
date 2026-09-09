/**
 * Google reCAPTCHA v3 Server-Side Verification
 * Validates invisible bot protection tokens against Google's API.
 */

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export async function verifyRecaptchaToken(
  token?: string | null
): Promise<{ valid: boolean; score?: number; reason?: string }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  // If reCAPTCHA is not configured in local development, permit pass for ease of testing.
  // In production, missing secret is blocked to prevent bot denial of service.
  if (!secretKey || secretKey.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY ERROR] RECAPTCHA_SECRET_KEY is missing in production. Rejecting unverified request.');
      return { valid: false, reason: 'unconfigured_production_recaptcha' };
    }
    return { valid: true, reason: 'skipped_no_secret' };
  }

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return { valid: false, reason: 'missing_token' };
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey.trim());
    params.append('response', token.trim());

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.warn('[reCAPTCHA API HTTP Error]:', response.status);
      return { valid: false, reason: 'api_http_error' };
    }

    const data: RecaptchaVerifyResponse = await response.json();

    if (!data.success) {
      console.warn('[reCAPTCHA Verification Failed]:', data['error-codes']);
      return { valid: false, reason: 'invalid_token' };
    }

    // Google reCAPTCHA v3 score: 0.0 (bot) to 1.0 (human)
    // 0.5 is Google's recommended threshold for form submissions
    const score = typeof data.score === 'number' ? data.score : 1.0;
    if (score < 0.5) {
      console.warn(`[reCAPTCHA Low Score Blocked]: score=${score}`);
      return { valid: false, score, reason: 'low_score' };
    }

    return { valid: true, score };
  } catch (error) {
    console.error('[reCAPTCHA Exception]:', error);
    return { valid: false, reason: 'network_error' };
  }
}
