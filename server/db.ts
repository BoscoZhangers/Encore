import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
export type Row = Record<string, any>;
export interface Query {
  all(sql: string, args?: any[]): Promise<Row[]>;
  get(sql: string, args?: any[]): Promise<Row | undefined>;
  run(sql: string, args?: any[]): Promise<number>;
}
export interface DB extends Query {
  transaction<T>(fn: (q: Query) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
const schema = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, email_notifications INTEGER NOT NULL DEFAULT 0, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, condition TEXT NOT NULL, price INTEGER NOT NULL CHECK(price>0), floor INTEGER NOT NULL CHECK(floor>0 AND floor<=price), quantity INTEGER NOT NULL CHECK(quantity>0), reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved>=0), sold INTEGER NOT NULL DEFAULT 0 CHECK(sold>=0), status TEXT NOT NULL DEFAULT 'draft', area TEXT NOT NULL, latitude REAL, longitude REAL, pickup TEXT NOT NULL, photos TEXT NOT NULL DEFAULT '[]', facts TEXT NOT NULL DEFAULT '[]', private_notes TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL DEFAULT '', share_contact INTEGER NOT NULL DEFAULT 0, wallet TEXT NOT NULL DEFAULT '', sol_lamports BIGINT NOT NULL DEFAULT 0, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, CHECK(reserved+sold<=quantity))`,
  `CREATE TABLE IF NOT EXISTS listing_views (listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE, viewer_key TEXT NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY(listing_id,viewer_key))`,
  `CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, storage TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE, buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at BIGINT NOT NULL, UNIQUE(listing_id,buyer_id))`,
  `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, role TEXT NOT NULL, body TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS message_reads (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE, PRIMARY KEY(user_id,message_id))`,
  `CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, question TEXT NOT NULL, answer TEXT, amount INTEGER, quantity INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'pending', reason TEXT, signature TEXT UNIQUE, payment_reference TEXT, payment_wallet TEXT, payment_lamports BIGINT, payment_created_at BIGINT, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sale_completions (request_id TEXT PRIMARY KEY REFERENCES requests(id) ON DELETE CASCADE, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, href TEXT NOT NULL, seen INTEGER NOT NULL DEFAULT 0, emailed INTEGER NOT NULL DEFAULT 0, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS blocks (seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(seller_id,buyer_id))`,
  `CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL, reason TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS operations (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, key TEXT NOT NULL, fingerprint TEXT NOT NULL, result TEXT NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY(user_id,key))`,
  `CREATE INDEX IF NOT EXISTS listings_status_time ON listings(status,created_at)`,
  `CREATE INDEX IF NOT EXISTS messages_conversation_time ON messages(conversation_id,created_at)`,
  `CREATE INDEX IF NOT EXISTS events_user_time ON events(user_id,created_at)`,
];
export async function openDB(options: { url?: string; file?: string } = {}): Promise<DB> {
  let db: DB;
  if (options.url) {
    const pool = new Pool({ connectionString: options.url, max: 10 });
    const query = (client: any): Query => ({
      all: async (s, a = []) => {
        let n = 0;
        return (
          await client.query(
            s.replace(/\?/g, () => `$${++n}`),
            a,
          )
        ).rows;
      },
      get: async (s, a) => (await query(client).all(s, a))[0],
      run: async (s, a = []) => {
        let n = 0;
        return (
          (
            await client.query(
              s.replace(/\?/g, () => `$${++n}`),
              a,
            )
          ).rowCount || 0
        );
      },
    });
    db = {
      ...query(pool),
      transaction: async (fn) => {
        // Callbacks contain database operations only, so serialization retries
        // cannot repeat an external message, payment, or model request.
        for (let attempt = 0; ; attempt++) {
          const c = await pool.connect();
          try {
            await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
            const result = await fn(query(c));
            await c.query('COMMIT');
            return result;
          } catch (e: any) {
            await c.query('ROLLBACK');
            if (attempt < 2 && ['40001', '40P01'].includes(e.code)) continue;
            throw e;
          } finally {
            c.release();
          }
        }
      },
      close: () => pool.end(),
    };
  } else {
    const file = options.file || path.resolve(process.env.DATA_DIR || 'data', 'encore.sqlite');
    if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
    const sqlite = new DatabaseSync(file);
    sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    const raw: Query = {
      all: async (s, a = []) => sqlite.prepare(s).all(...a) as Row[],
      get: async (s, a = []) => sqlite.prepare(s).get(...a) as Row | undefined,
      run: async (s, a = []) => Number(sqlite.prepare(s).run(...a).changes),
    };
    let tail: Promise<any> = Promise.resolve();
    const lock = <T>(fn: () => Promise<T>): Promise<T> => {
      const p = tail.then(fn);
      tail = p.catch(() => {});
      return p;
    };
    db = {
      all: (s, a) => lock(() => raw.all(s, a)),
      get: (s, a) => lock(() => raw.get(s, a)),
      run: (s, a) => lock(() => raw.run(s, a)),
      transaction: (fn) =>
        lock(async () => {
          sqlite.exec('BEGIN IMMEDIATE');
          try {
            const result = await fn(raw);
            sqlite.exec('COMMIT');
            return result;
          } catch (e) {
            sqlite.exec('ROLLBACK');
            throw e;
          }
        }),
      close: async () => {
        await tail;
        sqlite.close();
      },
    };
  }
  for (const sql of schema) await db.run(sql);
  return db;
}
