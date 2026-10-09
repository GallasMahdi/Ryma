import { localizeApiError } from '@/lib/api-i18n';
import { isJsonObject } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbGetAllReviewsAdmin, dbUpdateReviewStatus, dbDeleteReview, dbCreateReview } from '@/lib/db';
import { ReviewStatus } from '@/types/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/admin/reviews ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401

  try {
    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get('status') as ReviewStatus | 'ALL' | null;
    const search = searchParams.get('search') ?? undefined;

    const reviews = await dbGetAllReviewsAdmin({
      status: statusParam ?? 'ALL',
      search,
    });

    return NextResponse.json(
      { reviews },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
      }
    );
  } catch (err) {
    console.error('[GET /api/admin/reviews Error]:');
    return NextResponse.json(
      { error: localizeApiError('Falha ao carregar as avaliações de administração.', request) },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/admin/reviews ────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: localizeApiError('JSON object required', request) }, { status: 400 });
    const { id, status, verified, isFeatured } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: localizeApiError('ID da avaliação obrigatório.', request) }, { status: 400 });
    }

    if (status !== undefined && !['PENDING', 'APPROVED', 'REJECTED'].includes(String(status))) return NextResponse.json({ error: localizeApiError('Invalid review status', request) }, { status: 422 });
    if ((verified !== undefined && typeof verified !== 'boolean') || (isFeatured !== undefined && typeof isFeatured !== 'boolean')) return NextResponse.json({ error: localizeApiError('Invalid review flags', request) }, { status: 422 });
    const updated = await dbUpdateReviewStatus(id, {
      status: status as ReviewStatus | undefined,
      verified,
      isFeatured,
    });

    if (!updated) {
      return NextResponse.json({ error: localizeApiError('Avaliação não encontrada.', request) }, { status: 404 });
    }

    return NextResponse.json({ success: true, review: updated });
  } catch (err) {
    console.error('[PATCH /api/admin/reviews Error]:');
    return NextResponse.json(
      { error: localizeApiError('Erro ao atualizar a avaliação.', request) },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/admin/reviews ───────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  try {
    const { searchParams } = request.nextUrl;
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: localizeApiError('JSON object required', request) }, { status: 400 });
        id = typeof body.id === 'string' ? body.id : null;
      } catch {
        /* ignore json parse error if empty */
      }
    }

    if (!id) {
      return NextResponse.json({ error: localizeApiError('ID da avaliação obrigatório.', request) }, { status: 400 });
    }

    await dbDeleteReview(id);
    return NextResponse.json({ success: true, message: 'Avaliação removida com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/admin/reviews Error]:');
    return NextResponse.json(
      { error: localizeApiError('Erro ao remover a avaliação.', request) },
      { status: 500 }
    );
  }
}
