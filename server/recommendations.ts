import type { DB, Query, Row } from './db.js';
import { publicListing } from './domain.js';

export const INTEREST_WEIGHTS = {
  purchase: 12,
  chat: 5,
  view: 1,
} as const;

type InterestSignal = keyof typeof INTEREST_WEIGHTS;

export async function recordCategoryInterest(
  q: Query,
  userId: string,
  category: string,
  signal: InterestSignal,
  amount = 1,
) {
  const column =
    signal === 'purchase' ? 'purchase_count' : signal === 'chat' ? 'chat_count' : 'view_count';
  const counts = {
    view_count: signal === 'view' ? amount : 0,
    chat_count: signal === 'chat' ? amount : 0,
    purchase_count: signal === 'purchase' ? amount : 0,
  };
  await q.run(
    `INSERT INTO user_category_interests
      (user_id,category,view_count,chat_count,purchase_count,updated_at)
     VALUES(?,?,?,?,?,?)
     ON CONFLICT(user_id,category) DO UPDATE SET
       ${column}=user_category_interests.${column}+excluded.${column},
       updated_at=excluded.updated_at`,
    [userId, category, counts.view_count, counts.chat_count, counts.purchase_count, Date.now()],
  );
}

function score(row: Row) {
  return (
    Number(row.purchase_count || 0) * INTEREST_WEIGHTS.purchase +
    Number(row.chat_count || 0) * INTEREST_WEIGHTS.chat +
    Number(row.view_count || 0) * INTEREST_WEIGHTS.view
  );
}

export async function recommendationFeed(db: DB, userId?: string, limit = 16) {
  const interests = userId
    ? (
        await db.all(
          `SELECT category,view_count,chat_count,purchase_count,updated_at
         FROM user_category_interests WHERE user_id=?`,
          [userId],
        )
      )
        .map((row) => ({
          category: row.category,
          views: Number(row.view_count),
          chats: Number(row.chat_count),
          purchases: Number(row.purchase_count),
          score: score(row),
        }))
        .sort((a, b) => b.score - a.score || a.category.localeCompare(b.category))
    : [];

  const rows = await db.all(
    `SELECT l.*,u.name AS seller_name,
       (SELECT p.photo_id FROM profiles p WHERE p.user_id=l.seller_id) AS avatar_photo_id,
       (SELECT COUNT(*) FROM listing_views v WHERE v.listing_id=l.id) AS views,
       COALESCE(i.purchase_count,0)*${INTEREST_WEIGHTS.purchase}+
       COALESCE(i.chat_count,0)*${INTEREST_WEIGHTS.chat}+
       COALESCE(i.view_count,0)*${INTEREST_WEIGHTS.view} AS interest_score,
       CASE WHEN EXISTS (
         SELECT 1 FROM requests r
         WHERE r.listing_id=l.id AND r.kind='offer' AND r.status IN ('pending','approved')
       ) THEN 'negotiating' ELSE 'active' END AS market_status
     FROM listings l
     JOIN users u ON u.id=l.seller_id
     LEFT JOIN user_category_interests i ON i.user_id=? AND i.category=l.category
     WHERE l.status='published' AND l.quantity-l.reserved-l.sold>0
       ${userId ? 'AND l.seller_id<>?' : ''}
     ORDER BY interest_score DESC, views DESC, l.created_at DESC
     LIMIT ?`,
    userId ? [userId, userId, limit] : ['', limit],
  );

  return {
    listings: rows.map((row) => ({
      ...publicListing(row),
      market_status: row.market_status,
      recommendation_score: Number(row.interest_score || 0),
    })),
    interests,
    personalized: interests.length > 0,
  };
}
