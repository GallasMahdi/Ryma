import { randomUUID } from 'node:crypto';
import { executeAtomicBatch, executeConditionalBatch, executeQuery } from '@/lib/db';
import type { Conversation, IncomingMessage, Reply } from './types';

let schemaReady: Promise<void> | undefined;
export function ensureWhatsappSchema(): Promise<void> {
  schemaReady ??= executeAtomicBatch([
    {sql: `CREATE TABLE IF NOT EXISTS whatsapp_conversations (
      phone TEXT PRIMARY KEY, state TEXT, lockToken TEXT, lockUntil INTEGER NOT NULL DEFAULT 0, updatedAt INTEGER NOT NULL
    )`, args: []},
    {sql: `CREATE TABLE IF NOT EXISTS whatsapp_inbox (
      id TEXT PRIMARY KEY, phone TEXT NOT NULL, payload TEXT NOT NULL, sentAt INTEGER NOT NULL,
      receivedAt INTEGER NOT NULL, processedAt INTEGER, attempts INTEGER NOT NULL DEFAULT 0, nextAttemptAt INTEGER NOT NULL DEFAULT 0
    )`, args: []},
    {sql: 'CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_pending ON whatsapp_inbox(processedAt, nextAttemptAt, sentAt)', args: []},
    {sql: `CREATE TABLE IF NOT EXISTS whatsapp_outbox (
      id TEXT PRIMARY KEY, phone TEXT NOT NULL, payload TEXT NOT NULL, createdAt INTEGER NOT NULL, expiresAt INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', providerId TEXT, attempts INTEGER NOT NULL DEFAULT 0,
      nextAttemptAt INTEGER NOT NULL DEFAULT 0, lockToken TEXT, lockUntil INTEGER NOT NULL DEFAULT 0, errorCode TEXT
    )`, args: []},
    {sql: 'CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_pending ON whatsapp_outbox(status, nextAttemptAt, createdAt)', args: []},
  ]).catch(error => {schemaReady = undefined; throw error;});
  return schemaReady;
}

export async function enqueueMessages(messages: IncomingMessage[]) {
  await ensureWhatsappSchema();
  for (const message of messages) {
    const counts = await executeQuery<{count: number}>('SELECT COUNT(*) AS count FROM whatsapp_inbox WHERE phone = ? AND receivedAt > ?', [message.from, Date.now() - 60_000]);
    if (Number(counts[0]?.count) >= 30) continue;
    await executeQuery('INSERT INTO whatsapp_inbox (id, phone, payload, sentAt, receivedAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING', [message.id, message.from, JSON.stringify(message), message.timestamp, Date.now()]);
  }
}

export async function lockConversation(phone: string): Promise<{token: string; state: Conversation | null} | null> {
  const token = randomUUID(), now = Date.now();
  const rows = await executeQuery<{state: string | null}>(`INSERT INTO whatsapp_conversations (phone, lockToken, lockUntil, updatedAt) VALUES (?, ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET lockToken = excluded.lockToken, lockUntil = excluded.lockUntil
    WHERE whatsapp_conversations.lockUntil < ? RETURNING state`, [phone, token, now + 120_000, now, now]);
  if (!rows.length) return null;
  return {token, state: rows[0].state ? JSON.parse(rows[0].state) as Conversation : null};
}

export async function commitConversation(phone: string, token: string, message: IncomingMessage, state: Conversation, replies: Reply[]): Promise<boolean> {
  const now = Date.now();
  return executeConditionalBatch({sql: 'SELECT 1 FROM whatsapp_conversations WHERE phone = ? AND lockToken = ? AND lockUntil > ?', args: [phone, token, now]}, [
    {sql: 'UPDATE whatsapp_conversations SET state = ?, updatedAt = ? WHERE phone = ?', args: [JSON.stringify(state), now, phone]},
    {sql: 'UPDATE whatsapp_inbox SET processedAt = ?, payload = ? WHERE id = ?', args: [now, '{}', message.id]},
    ...replies.map((reply, index) => ({
      sql: 'INSERT INTO whatsapp_outbox (id, phone, payload, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
      args: [`${message.id}:${index}`, phone, JSON.stringify(reply), now, message.timestamp + 24 * 3600000 - 60_000],
    })),
  ]);
}

export async function unlockConversation(phone: string, token: string) {
  await executeQuery('UPDATE whatsapp_conversations SET lockUntil = 0, lockToken = NULL WHERE phone = ? AND lockToken = ?', [phone, token]);
}

export async function cleanupWhatsappData() {
  const now = Date.now();
  // Retain message IDs briefly for replay protection; erase conversation content sooner.
  await executeAtomicBatch([
    {sql: "UPDATE whatsapp_inbox SET processedAt = ?, payload = '{}' WHERE processedAt IS NULL AND sentAt < ?", args: [now, now - 24 * 3600000]},
    {sql: "UPDATE whatsapp_outbox SET status = 'expired', payload = '{}' WHERE status = 'pending' AND expiresAt <= ? AND lockUntil < ?", args: [now, now]},
    {sql: 'DELETE FROM whatsapp_inbox WHERE processedAt IS NOT NULL AND receivedAt < ?', args: [now - 30 * 86400000]},
    {sql: 'DELETE FROM whatsapp_outbox WHERE createdAt < ?', args: [now - 30 * 86400000]},
    {sql: 'DELETE FROM whatsapp_conversations WHERE updatedAt < ? AND lockUntil < ?', args: [now - 86400000, now]},
  ]);
}
