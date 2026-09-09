import { NextRequest, NextResponse } from 'next/server';
import { dbGetApprovedReviews, dbCreateReview, dbCheckRateLimit, dbRecordRateLimitAttempt } from '@/lib/db';
import { SERVICES } from '@/data/services';
import { getClientIp } from '@/lib/validation';
import { verifyRecaptchaToken } from '@/lib/recaptcha';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/reviews ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const serviceSlug = searchParams.get('serviceSlug') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const reviews = await dbGetApprovedReviews({ serviceSlug, limit });

    return NextResponse.json(
      { reviews },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('[GET /api/reviews Error]:', err);
    return NextResponse.json(
      { error: 'Não foi possível carregar as avaliações.' },
      { status: 500 }
    );
  }
}

// ─── POST /api/reviews ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Rate Limiting: max 5 review submissions per IP per hour
    const allowed = await dbCheckRateLimit(ip, 'review_post', 5, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas tentativas. Por favor aguarde antes de enviar outra avaliação.' },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Formato JSON inválido.' }, { status: 400 });
    }

    const {
      patientName,
      patientEmail,
      rating,
      serviceSlug,
      comment,
      location,
      honeypot,
      recaptchaToken,
    } = body;

    // Bot detection honeypot field
    if (honeypot) {
      return NextResponse.json({ error: 'Spam detectado.' }, { status: 400 });
    }

    // Google reCAPTCHA v3 bot verification
    const token = typeof recaptchaToken === 'string' ? recaptchaToken : null;
    const recaptchaResult = await verifyRecaptchaToken(token);
    if (!recaptchaResult.valid) {
      return NextResponse.json(
        { error: 'Verificação de segurança falhou (atividade automatizada detetada).' },
        { status: 403 }
      );
    }

    if (!patientName || typeof patientName !== 'string' || patientName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Por favor, indique o seu nome (mínimo 2 caracteres).' },
        { status: 400 }
      );
    }

    const cleanName = patientName.trim().slice(0, 80);

    // Reject HTML tags, script injection, and formula injection
    if (/[<>]|javascript:|data:/i.test(cleanName)) {
      return NextResponse.json({ error: 'Caracteres não permitidos detetados no nome.' }, { status: 422 });
    }
    if (/^[=\+\-@\t\r]/.test(cleanName)) {
      return NextResponse.json({ error: 'Formato inválido no nome.' }, { status: 422 });
    }

    const numRating = Number(rating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: 'A classificação deve ser entre 1 e 5 estrelas.' },
        { status: 400 }
      );
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
      return NextResponse.json(
        { error: 'Por favor, partilhe um comentário com pelo menos 5 caracteres.' },
        { status: 400 }
      );
    }

    if (comment.trim().length > 1500) {
      return NextResponse.json(
        { error: 'O comentário excede o limite máximo de 1500 caracteres.' },
        { status: 400 }
      );
    }

    const cleanComment = comment.trim().slice(0, 1500);

    if (/[<>]|javascript:|data:/i.test(cleanComment)) {
      return NextResponse.json({ error: 'Caracteres não permitidos detetados no comentário.' }, { status: 422 });
    }
    if (/^[=\+\-@\t\r]/.test(cleanComment)) {
      return NextResponse.json({ error: 'Formato inválido no comentário.' }, { status: 422 });
    }

    const validSlug = typeof serviceSlug === 'string' && serviceSlug.trim() ? serviceSlug.trim() : 'reeducation-posturale';

    // Anti-defacement: Reviews require moderation (PENDING) before appearing publicly
    const review = await dbCreateReview({
      patientName: cleanName,
      patientEmail: typeof patientEmail === 'string' && patientEmail.trim() ? patientEmail.trim().slice(0, 254) : null,
      rating: Math.round(numRating),
      serviceSlug: validSlug,
      comment: cleanComment,
      location: typeof location === 'string' && location.trim() ? location.trim().slice(0, 60) : 'Lisboa',
      status: 'PENDING',
      verified: false,
      isFeatured: false,
    });

    await dbRecordRateLimitAttempt(ip, 'review_post');

    return NextResponse.json(
      {
        success: true,
        message: 'A sua avaliação foi submetida com sucesso e será publicada após moderação da clínica. Obrigado!',
        review: {
          id: review.id,
          patientName: review.patientName,
          rating: review.rating,
          serviceSlug: review.serviceSlug,
          comment: review.comment,
          location: review.location,
          status: review.status,
          createdAt: review.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/reviews Error]:', err);
    return NextResponse.json(
      { error: 'Erro ao registar a avaliação. Por favor tente novamente.' },
      { status: 500 }
    );
  }
}
