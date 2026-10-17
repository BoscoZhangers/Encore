import type { Query, Row } from './db.js';

// Sellers receive buyer messages; buyers receive seller and Cora messages.
export function isIncoming(role: string, isSeller: boolean) {
  return isSeller ? role === 'buyer' : role === 'seller' || role === 'agent';
}

export async function unreadMessageCount(q: Query, userId: string) {
  const row = await q.get(
    `SELECT COUNT(*) AS total FROM messages m
     JOIN conversations c ON c.id=m.conversation_id
     JOIN listings l ON l.id=c.listing_id
     LEFT JOIN message_reads r ON r.message_id=m.id AND r.user_id=?
     WHERE r.message_id IS NULL AND
     ((l.seller_id=? AND m.role='buyer') OR (c.buyer_id=? AND m.role IN ('seller','agent')))`,
    [userId, userId, userId],
  );
  return Number(row!.total);
}

export async function conversationMessages(q: Query, conversation: Row, userId: string) {
  const rows = await q.all(
    `SELECT m.*,r.message_id AS read_id FROM messages m
     LEFT JOIN message_reads r ON r.message_id=m.id AND r.user_id=?
     WHERE m.conversation_id=? ORDER BY m.created_at,m.id`,
    [userId, conversation.id],
  );
  return {
    messages: rows.map(({ read_id, ...message }) => message),
    unreadMessageIds: rows
      .filter((m) => !m.read_id && isIncoming(m.role, conversation.seller_id === userId))
      .map((m) => m.id as string),
  };
}
