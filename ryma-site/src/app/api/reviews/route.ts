import { localizeApiError } from '@/lib/api-i18n';
import { isKnownTreatment } from '@/lib/treatments';
import { NextRequest, NextResponse } from 'next/server';
import { dbGetApprovedReviews, dbGetApprovedReviewStats, dbCreateReview, dbConsumeRateLimit } from '@/lib/db';
import { getClientIp } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/reviews ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const serviceSlug = searchParams.get('serviceSlug') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam === null ? 100 : Number(limitParam);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({error:localizeApiError('limit must be an integer between 1 and 100', request)},{status:400});
    }

    const [reviews,stats] = await Promise.all([dbGetApprovedReviews({ serviceSlug, limit }),dbGetApprovedReviewStats(serviceSlug)]);

    return NextResponse.json(
      { reviews, stats },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('[GET /api/reviews Error]:');
    return NextResponse.json(
      { error: localizeApiError('Não foi possível carregar as avaliações.', request) },
      { status: 500 }
    );
  }
}

// ─── POST /api/reviews ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Rate Limiting: max 5 review submissions per IP per hour
    const allowed = await dbConsumeRateLimit(ip, 'review_post', 5, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: localizeApiError('Demasiadas tentativas. Por favor aguarde antes de enviar outra avaliação.', request) },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: localizeApiError('Formato JSON inválido.', request) }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: localizeApiError('Formato JSON inválido.', request) }, { status: 400 });
    }

    const {
      patientName,
      patientEmail,
      rating,
      serviceSlug,
      comment,
      location,
      honeypot,
    } = body;

    // Bot detection honeypot field
    if (honeypot) {
      return NextResponse.json({ error: localizeApiError('Spam detectado.', request) }, { status: 400 });
    }

    if (!patientName || typeof patientName !== 'string' || patientName.trim().length < 2) {
      return NextResponse.json(
        { error: localizeApiError('Por favor, indique o seu nome (mínimo 2 caracteres).', request) },
        { status: 400 }
      );
    }

    const cleanName = patientName.trim().slice(0, 80);

    // Reject HTML tags, script injection, and formula injection
    if (/[<>]|javascript:|data:/i.test(cleanName)) {
      return NextResponse.json({ error: localizeApiError('Caracteres não permitidos detetados no nome.', request) }, { status: 422 });
    }
    if (/^[=\+\-@\t\r]/.test(cleanName)) {
      return NextResponse.json({ error: localizeApiError('Formato inválido no nome.', request) }, { status: 422 });
    }

    const numRating = Number(rating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: localizeApiError('A classificação deve ser entre 1 e 5 estrelas.', request) },
        { status: 400 }
      );
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
      return NextResponse.json(
        { error: localizeApiError('Por favor, partilhe um comentário com pelo menos 5 caracteres.', request) },
        { status: 400 }
      );
    }

    if (comment.trim().length > 1500) {
      return NextResponse.json(
        { error: localizeApiError('O comentário excede o limite máximo de 1500 caracteres.', request) },
        { status: 400 }
      );
    }

    const cleanComment = comment.trim().slice(0, 1500);

    if (/[<>]|javascript:|data:/i.test(cleanComment)) {
      return NextResponse.json({ error: localizeApiError('Caracteres não permitidos detetados no comentário.', request) }, { status: 422 });
    }
    if (/^[=\+\-@\t\r]/.test(cleanComment)) {
      return NextResponse.json({ error: localizeApiError('Formato inválido no comentário.', request) }, { status: 422 });
    }

    const validSlug = typeof serviceSlug === 'string' ? serviceSlug.trim() : '';

    // A patient can review a treatment received before it was archived; all reviews are moderated.
    if(!await isKnownTreatment(validSlug))return NextResponse.json({error:localizeApiError('Escolha um tratamento existente.', request)},{status:422});

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
    console.error('[POST /api/reviews Error]:');
    return NextResponse.json(
      { error: localizeApiError('Erro ao registar a avaliação. Por favor tente novamente.', request) },
      { status: 500 }
    );
  }
}
