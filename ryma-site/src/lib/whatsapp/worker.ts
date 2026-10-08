import { randomUUID } from 'node:crypto';
import { executeQuery } from '@/lib/db';
import { advanceConversation } from './conversation';
import { whatsappConfig } from './config';
import { cleanupWhatsappData, commitConversation, ensureWhatsappSchema, lockConversation, unlockConversation } from './store';
import type { IncomingMessage, Reply } from './types';

export async function sendWhatsappReply(phone: string, reply: Reply): Promise<string> {
  const config = whatsappConfig();
  if (!config.ready) throw new Error('whatsapp_not_configured');
  if (config.allowedSenders.length && !config.allowedSenders.includes(phone)) throw new Error('sender_not_allowed');
  const response = await fetch(`https://graph.facebook.com/${config.version}/${config.phoneId}/messages`, {
    method: 'POST', headers: {'Authorization': `Bearer ${config.token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, ...reply}),
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.json();
  if (!response.ok || typeof body.messages?.[0]?.id !== 'string') {
    // Never log Meta's body: it can include recipients or echoed message content.
    throw new Error(`meta_${Number(body.error?.code) || response.status}`);
  }
  return body.messages[0].id;
}

export async function drainWhatsappOutbox(deadline = Date.now() + 20_000): Promise<number> {
  let sent = 0;
  const rows = await executeQuery<{id: string; phone: string; payload: string; attempts: number}>(`SELECT o.* FROM whatsapp_outbox o
    WHERE o.status = 'pending' AND o.nextAttemptAt <= ? AND o.lockUntil < ? AND o.expiresAt > ?
    AND NOT EXISTS (SELECT 1 FROM whatsapp_outbox earlier WHERE earlier.phone = o.phone AND earlier.status = 'pending' AND earlier.rowid < o.rowid)
    ORDER BY o.createdAt LIMIT 20`, [Date.now(), Date.now(), Date.now()]);
  for (const row of rows) {
    if (Date.now() >= deadline) break;
    const token = randomUUID();
    const claimed = await executeQuery<{id: string}>("UPDATE whatsapp_outbox SET lockToken = ?, lockUntil = ? WHERE id = ? AND status = 'pending' AND lockUntil < ? RETURNING id", [token, Date.now() + 30_000, row.id, Date.now()]);
    if (!claimed.length) continue;
    try {
      const providerId = await sendWhatsappReply(row.phone, JSON.parse(row.payload));
      await executeQuery("UPDATE whatsapp_outbox SET status = 'sent', providerId = ?, payload = '{}', lockUntil = 0, lockToken = NULL WHERE id = ? AND lockToken = ?", [providerId, row.id, token]);
      sent++;
    } catch (error) {
      const code = error instanceof Error && /^meta_\d+$/.test(error.message) ? error.message : 'send_failed';
      const terminal = row.attempts >= 7 || code === 'meta_131047';
      await executeQuery('UPDATE whatsapp_outbox SET attempts = attempts + 1, status = ?, nextAttemptAt = ?, errorCode = ?, lockUntil = 0, lockToken = NULL WHERE id = ? AND lockToken = ?', [terminal ? 'failed' : 'pending', Date.now() + Math.min(3600000, 5000 * 2 ** row.attempts), code, row.id, token]);
    }
  }
  return sent;
}

export async function runWhatsappWorker(): Promise<{processed: number; sent: number}> {
  if (!whatsappConfig().ready) return {processed: 0, sent: 0};
  await ensureWhatsappSchema();
  await cleanupWhatsappData();
  const deadline = Date.now() + 20_000;
  let processed = 0;
  const phones = await executeQuery<{phone: string}>(`SELECT phone FROM whatsapp_inbox WHERE processedAt IS NULL AND nextAttemptAt <= ? GROUP BY phone ORDER BY MIN(sentAt) LIMIT 10`, [Date.now()]);
  for (const {phone} of phones) {
    if (Date.now() >= deadline) break;
    const lock = await lockConversation(phone);
    if (!lock) continue;
    try {
      let state = lock.state;
      const messages = await executeQuery<{id: string; payload: string; attempts: number; nextAttemptAt: number}>('SELECT id, payload, attempts, nextAttemptAt FROM whatsapp_inbox WHERE phone = ? AND processedAt IS NULL ORDER BY sentAt, rowid LIMIT 10', [phone]);
      for (const row of messages) {
        if (Date.now() >= deadline || row.nextAttemptAt > Date.now()) break;
        try {
          const incoming = JSON.parse(row.payload) as IncomingMessage;
          const result = await advanceConversation(state, incoming);
          if (!await commitConversation(phone, lock.token, incoming, result.state, result.replies)) break;
          state = result.state;
          processed++;
        } catch {
          await executeQuery('UPDATE whatsapp_inbox SET attempts = attempts + 1, nextAttemptAt = ? WHERE id = ?', [Date.now() + Math.min(3600000, 5000 * 2 ** Math.min(row.attempts, 10)), row.id]);
          break;
        }
      }
    } finally { await unlockConversation(phone, lock.token); }
  }
  const sent = await drainWhatsappOutbox(Date.now() + 20_000);
  return {processed, sent};
}
