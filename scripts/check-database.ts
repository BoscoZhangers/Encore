import 'dotenv/config';
import { openDB } from '../server/db.js';

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL is not set. Add the Tiger Data service URI to your local .env.');
  process.exitCode = 1;
} else {
  const db = await openDB({ url });
  try {
    await db.ping();
    const migration = await db.get(
      'SELECT version,applied_at FROM encore_schema_migrations ORDER BY version DESC LIMIT 1',
    );
    const tables = await db.get(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
    );
    console.log(
      `Tiger Data connection ready · schema v${Number(migration?.version || 0)} · ${Number(tables?.count || 0)} tables`,
    );
  } finally {
    await db.close();
  }
}
