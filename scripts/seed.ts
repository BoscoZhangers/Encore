import 'dotenv/config';
import { openDB } from '../server/db.js';
import { id, passwordHash } from '../server/domain.js';
import { seedDemoItems } from './demo-items.js';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
if (process.env.NODE_ENV === 'production') throw Error('Demo seeding is disabled in production');
const db = await openDB({ url: process.env.DATABASE_URL });
try {
  const existing = await db.get('SELECT id FROM users WHERE email=?', ['seller@encore.demo']);
  const replace = process.argv.includes('--refresh-demo');
  if (existing && !replace) {
    await seedDemoItems(db, existing.id, false);
    console.log('Missing fictional demo items were added; existing demo history was preserved.');
  } else {
    if (existing && replace && !process.env.DATABASE_URL) {
      const directory = path.resolve(process.env.DATA_DIR || 'data', 'backups');
      await mkdir(directory, { recursive: true });
      const backup = path.join(directory, `before-demo-refresh-${Date.now()}.sqlite`);
      // SQLite creates a consistent backup, including committed WAL contents.
      // Any backup failure aborts before the old demo inventory is changed.
      await db.run('VACUUM INTO ?', [backup]);
      console.log(`Previous demo data backed up to ${backup}`);
    }
    const sellerId = existing?.id || id();
    for (const [uid, name, email] of [
      [sellerId, 'Maya Chen', 'seller@encore.demo'],
      [id(), 'Alex Morgan', 'buyer@encore.demo'],
    ]) {
      if (!(await db.get('SELECT id FROM users WHERE email=?', [email])))
        await db.run('INSERT INTO users(id,name,email,password,created_at) VALUES(?,?,?,?,?)', [
          uid,
          name,
          email,
          passwordHash('EncoreDemo2026!'),
          Date.now(),
        ]);
    }
    await seedDemoItems(db, sellerId, replace);
    console.log(
      'Eight fictional demo items with photos are ready. Seller: seller@encore.demo; buyer: buyer@encore.demo. Existing accounts keep their passwords. New accounts use EncoreDemo2026!',
    );
  }
} finally {
  await db.close();
}
