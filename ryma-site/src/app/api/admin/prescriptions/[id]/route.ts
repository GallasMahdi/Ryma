import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbDeletePrescription } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── DELETE /api/admin/prescriptions/[id] ───────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id } = await params;
  await dbDeletePrescription(id);

  return NextResponse.json({ success: true, message: 'Prescrição/Recomendação eliminada com sucesso' }, { status: 200 });
}
