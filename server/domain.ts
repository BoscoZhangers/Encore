import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { z } from 'zod';
import type { Query, Row } from './db.js';
export const id = () => randomUUID();
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const ensure = (condition: unknown, status: number, message: string): asserts condition => {
  if (!condition) throw new HttpError(status, message);
};
export const hashToken = (s: string) => createHash('sha256').update(s).digest('hex');
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function passwordValid(password: string, stored: string) {
  try {
    const [salt, key] = stored.split(':');
    const candidate = scryptSync(password, salt, 64);
    return timingSafeEqual(candidate, Buffer.from(key, 'hex'));
  } catch {
    return false;
  }
}
export const listingSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(2000),
    category: z.enum(['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports', 'Other']),
    condition: z.enum(['New', 'Like new', 'Good', 'Fair', 'For parts']),
    price: z.number().int().min(100).max(10000000),
    floor: z.number().int().min(100),
    quantity: z.number().int().min(1).max(1000),
    area: z.string().trim().min(2).max(100),
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),
    pickup: z.string().trim().min(3).max(400),
    photos: z.array(z.string().uuid()).max(5).default([]),
    facts: z
      .array(
        z.object({
          id: z.string().max(50),
          question: z.string().trim().min(3).max(200),
          answer: z.string().trim().min(1).max(800),
        }),
      )
      .max(40)
      .default([]),
    private_notes: z.string().max(1000).default(''),
    contact: z.string().max(200).default(''),
    share_contact: z.boolean().default(false),
    wallet: z.string().max(50).default(''),
    sol_lamports: z.number().int().min(0).max(10000000000).default(0),
    status: z.enum(['draft', 'published', 'paused']).default('draft'),
  })
  .refine((x) => x.floor <= x.price, 'Minimum price cannot exceed asking price')
  .refine(
    (x) => (x.latitude === null) === (x.longitude === null),
    'Provide both map coordinates or neither',
  );
export function publicListing(r: Row) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    condition: r.condition,
    price: r.price,
    views: Number(r.views || 0),
    quantity: r.quantity,
    available: r.quantity - r.reserved - r.sold,
    status: r.status,
    area: r.area,
    latitude: r.latitude,
    longitude: r.longitude,
    pickup: r.pickup,
    photos: JSON.parse(r.photos),
    seller_id: r.seller_id,
    seller_name: r.seller_name || 'Seller',
    seller_avatar_url: r.avatar_photo_id ? `/api/photos/${r.avatar_photo_id}` : null,
    created_at: Number(r.created_at),
  };
}
export function ownerListing(r: Row) {
  return {
    ...publicListing(r),
    facts: JSON.parse(r.facts),
    floor: r.floor,
    private_notes: r.private_notes,
    contact: r.contact,
    share_contact: !!r.share_contact,
    reserved: r.reserved,
    sold: r.sold,
    wallet: r.wallet,
    sol_lamports: Number(r.sol_lamports),
  };
}
export async function message(q: Query, conversationId: string, role: string, body: string) {
  const m = { id: id(), conversation_id: conversationId, role, body, created_at: Date.now() };
  await q.run(
    'INSERT INTO messages (id,conversation_id,role,body,created_at) VALUES (?,?,?,?,?)',
    Object.values(m),
  );
  return m;
}
export async function notify(q: Query, user: string, body: string, href: string) {
  await q.run('INSERT INTO notifications (id,user_id,body,href,created_at) VALUES (?,?,?,?,?)', [
    id(),
    user,
    body,
    href,
    Date.now(),
  ]);
}
export async function event(q: Query, user: string, name: string) {
  await q.run('INSERT INTO events (id,user_id,name,created_at) VALUES (?,?,?,?)', [
    id(),
    user,
    name,
    Date.now(),
  ]);
}
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export async function approveReservation(q: Query, requestId: string, sellerId: string) {
  const r = await q.get(
    'SELECT r.*,l.seller_id,l.floor,l.status AS listing_status FROM requests r JOIN listings l ON l.id=r.listing_id WHERE r.id=?',
    [requestId],
  );
  if (!r || r.seller_id !== sellerId) throw new HttpError(404, 'Request not found');
  if (r.kind !== 'offer' || r.status !== 'pending')
    throw new HttpError(409, 'Request is no longer pending');
  if (r.amount < r.floor) throw new HttpError(409, 'The offer is below your current minimum');
  const changed = await q.run(
    "UPDATE listings SET reserved=reserved+?,updated_at=? WHERE id=? AND status='published' AND quantity-reserved-sold>=? AND floor<=?",
    [r.quantity, Date.now(), r.listing_id, r.quantity, r.amount],
  );
  if (!changed) throw new HttpError(409, 'There is not enough available stock');
  const updated = await q.run(
    "UPDATE requests SET status='approved' WHERE id=? AND status='pending'",
    [r.id],
  );
  if (!updated) throw new HttpError(409, 'This request was already handled');
  await message(
    q,
    r.conversation_id,
    'seller',
    `Your reservation for ${r.quantity} item(s) at CAD ${(r.amount / 100).toFixed(2)} each is approved. Please confirm pickup arrangements.`,
  );
  await notify(q, r.buyer_id, 'Your reservation was approved.', `/messages/${r.conversation_id}`);
  const listing = await q.get('SELECT * FROM listings WHERE id=?', [r.listing_id]);
  const available = listing!.quantity - listing!.reserved - listing!.sold;
  const closed = await q.all(
    "SELECT * FROM requests WHERE listing_id=? AND kind='offer' AND status='pending' AND quantity>?",
    [r.listing_id, available],
  );
  for (const other of closed) {
    await q.run("UPDATE requests SET status='closed' WHERE id=? AND status='pending'", [other.id]);
    await message(
      q,
      other.conversation_id,
      'agent',
      'There is no longer enough stock for this pending request. No reservation was made.',
    );
  }
  await event(q, sellerId, 'reservation_approved');
  return { ok: true };
}
