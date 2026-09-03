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
    console.error('[GET /api/admin/reviews Error]:', err);
    return NextResponse.json(
      { error: 'Falha ao carregar as avaliações de administração.' },
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
    const { id, status, verified, isFeatured } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID da avaliação obrigatório.' }, { status: 400 });
    }

    const updated = await dbUpdateReviewStatus(id, {
      status,
      verified,
      isFeatured,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Avaliação não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, review: updated });
  } catch (err) {
    console.error('[PATCH /api/admin/reviews Error]:', err);
    return NextResponse.json(
      { error: 'Erro ao atualizar a avaliação.' },
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
        id = body.id;
      } catch {
        /* ignore json parse error if empty */
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID da avaliação obrigatório.' }, { status: 400 });
    }

    await dbDeleteReview(id);
    return NextResponse.json({ success: true, message: 'Avaliação removida com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/admin/reviews Error]:', err);
    return NextResponse.json(
      { error: 'Erro ao remover a avaliação.' },
      { status: 500 }
    );
  }
}
