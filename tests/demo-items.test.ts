import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDB } from '../server/db.js';
import { seedDemoItems, demoItems } from '../scripts/demo-items.js';
import { readPhoto } from '../server/storage.js';

test('concept demo inventory has eight stored photos and refresh protects reservations and other sellers', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'encore-demo-'));
  process.env.DATA_DIR = directory;
  delete process.env.S3_BUCKET;
  const db = await openDB({ file: ':memory:' });
  try {
    for (const [id, email] of [
      ['demo', 'seller@encore.demo'],
      ['other', 'other@example.com'],
    ])
      await db.run('INSERT INTO users(id,name,email,password,created_at) VALUES(?,?,?,?,?)', [
        id,
        'Test',
        email,
        'unused',
        1,
      ]);
    await seedDemoItems(db, 'demo');
    const rows = await db.all('SELECT * FROM listings ORDER BY created_at DESC');
    assert.deepEqual(
      rows.map((row) => row.title),
      demoItems.map((item) => item.title),
    );
    for (const row of rows) {
      const photo = await db.get('SELECT * FROM photos WHERE id=?', [JSON.parse(row.photos)[0]]);
      assert.ok(photo);
      assert.ok((await readPhoto(photo.id, photo.storage)).length > 1000);
      assert.equal(row.sold, 0);
    }
    await seedDemoItems(db, 'demo');
    assert.equal((await db.get('SELECT COUNT(*) AS count FROM listings'))!.count, 8);
    await assert.rejects(seedDemoItems(db, 'other', true), /Only the demo seller/);
    await db.run('UPDATE listings SET reserved=1 WHERE id=?', [rows[0].id]);
    await assert.rejects(seedDemoItems(db, 'demo', true), /Resolve demo reservations/);
    assert.equal((await db.get('SELECT COUNT(*) AS count FROM listings'))!.count, 8);
    await db.run('UPDATE listings SET reserved=0 WHERE id=?', [rows[0].id]);
    await seedDemoItems(db, 'demo', true);
    assert.equal((await db.get('SELECT COUNT(*) AS count FROM listings'))!.count, 8);
    assert.equal(await db.get('SELECT id FROM listings WHERE id=?', [rows[0].id]), undefined);
  } finally {
    await db.close();
    await rm(directory, { recursive: true, force: true });
  }
});
