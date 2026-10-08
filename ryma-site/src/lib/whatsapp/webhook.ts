import type { IncomingMessage } from './types';

/** Read only inbound messages for our configured business phone; statuses never book. */
export function parseWhatsappMessages(payload: unknown, phoneId: string, allowedSenders: string[] = []): IncomingMessage[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  if (root.object !== 'whatsapp_business_account' || !Array.isArray(root.entry)) return [];
  const messages: IncomingMessage[] = [];
  for (const entry of root.entry.slice(0, 100)) {
    if (!Array.isArray(entry?.changes)) continue;
    for (const change of entry.changes.slice(0, 100)) {
      const value = change?.value;
      if (change?.field !== 'messages' || value?.metadata?.phone_number_id !== phoneId || !Array.isArray(value?.messages)) continue;
      for (const message of value.messages.slice(0, 100)) {
        if (typeof message?.id !== 'string' || message.id.length > 256 || !/^[1-9]\d{7,14}$/.test(message?.from)) continue;
        if (allowedSenders.length && !allowedSenders.includes(message.from)) continue;
        const timestamp = Number(message.timestamp) * 1000;
        if (!Number.isFinite(timestamp) || timestamp < Date.now() - 24 * 3600000 || timestamp > Date.now() + 300000) continue;
        const text = message.type === 'text' && typeof message.text?.body === 'string' ? message.text.body.slice(0, 1000) : undefined;
        const rawChoice = message.type === 'interactive' ? message.interactive?.list_reply?.id ?? message.interactive?.button_reply?.id : undefined;
        messages.push({id: message.id, from: message.from, timestamp, text, choice: typeof rawChoice === 'string' ? rawChoice.slice(0, 256) : undefined});
        if (messages.length >= 100) return messages;
      }
    }
  }
  return messages;
}
