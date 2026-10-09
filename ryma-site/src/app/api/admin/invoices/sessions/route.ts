import { localizeApiError, requestLanguage } from '@/lib/api-i18n';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { isJsonObject } from '@/lib/admin-validation';
import { BillingError, createSessionInvoice } from '@/lib/session-billing';
import type { CreateSessionInvoiceInput } from '@/types/admin';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request); if ('status' in auth) return auth;
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({error:localizeApiError('JSON object required.', request)},{status:400});
  let bytes = 0, text = ''; const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 65536) { await reader.cancel(); return NextResponse.json({error:localizeApiError('Document request too large.', request)},{status:413}); }
      text += decoder.decode(chunk.value,{stream:true});
    }
    text += decoder.decode();
    const body = JSON.parse(text);
    if (!isJsonObject(body)) return NextResponse.json({error:localizeApiError('JSON object required.', request)},{status:400});
    const invoice = await createSessionInvoice(body as unknown as CreateSessionInvoiceInput,request.headers.get('Idempotency-Key')?.trim() || '', requestLanguage(request));
    return NextResponse.json({invoice},{status:201,headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({error:localizeApiError('Invalid JSON.', request)},{status:400});
    if (error instanceof BillingError) return NextResponse.json({error:localizeApiError(error.message, request),code:error.code},{status:error.status});
    console.error('[Session invoice creation failed]');
    return NextResponse.json({error:localizeApiError('Unable to save billing document.', request)},{status:500});
  } finally { reader.releaseLock(); }
}
