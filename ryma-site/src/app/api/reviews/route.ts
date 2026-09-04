import { NextRequest, NextResponse } from 'next/server';
import { dbGetApprovedReviews, dbCreateReview } from '@/lib/db';
import { SERVICES } from '@/data/services';

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
    } = body;

    // Bot detection honeypot field
    if (honeypot) {
      return NextResponse.json({ error: 'Spam detectado.' }, { status: 400 });
    }

    if (!patientName || typeof patientName !== 'string' || patientName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Por favor, indique o seu nome (mínimo 2 caracteres).' },
        { status: 400 }
      );
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

    const validSlug = typeof serviceSlug === 'string' && serviceSlug.trim() ? serviceSlug.trim() : 'reeducation-posturale';

    // Auto-approve user submission as requested
    const review = await dbCreateReview({
      patientName: patientName.trim(),
      patientEmail: typeof patientEmail === 'string' && patientEmail.trim() ? patientEmail.trim() : null,
      rating: Math.round(numRating),
      serviceSlug: validSlug,
      comment: comment.trim(),
      location: typeof location === 'string' && location.trim() ? location.trim() : 'Lisboa',
      status: 'APPROVED',
      verified: true,
      isFeatured: false,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'A sua avaliação foi registada e publicada com sucesso. Obrigado!',
        review,
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
