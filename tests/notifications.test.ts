import assert from 'node:assert/strict';
import test from 'node:test';
import { openDB } from '../server/db.js';
import { deliverNotifications } from '../server/notifications.js';

test('opted-in users receive every queued update, including Cora handoffs', async () => {
  const db = await openDB({ file: ':memory:' });
  const originalFetch = globalThis.fetch;
  const originalEnvironment = {
    key: process.env.RESEND_API_KEY,
    from: process.env.NOTIFICATION_FROM,
    origin: process.env.APP_ORIGIN,
  };
  const sent: any[] = [];

  try {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_FROM = 'Encore <notifications@example.com>';
    process.env.APP_ORIGIN = 'https://encore.example';
    globalThis.fetch = async (_url, options) => {
      sent.push(JSON.parse(String(options?.body)));
      return Response.json({ id: 'email-id' });
    };

    await db.run(
      'INSERT INTO users(id,name,email,password,email_notifications,created_at) VALUES(?,?,?,?,?,?)',
      ['seller', 'Seller', 'seller@example.com', 'hash', 1, Date.now()],
    );
    await db.run('INSERT INTO notifications(id,user_id,body,href,created_at) VALUES(?,?,?,?,?)', [
      'cora-help',
      'seller',
      'Cora needs your help answering a buyer.',
      '/inbox',
      Date.now(),
    ]);
    await db.run('INSERT INTO notifications(id,user_id,body,href,created_at) VALUES(?,?,?,?,?)', [
      'sale',
      'seller',
      'Your sale is complete.',
      '/activity',
      Date.now() + 1,
    ]);

    await deliverNotifications(db);

    assert.equal(sent.length, 2);
    assert.deepEqual(
      sent.map((email) => email.to),
      [['seller@example.com'], ['seller@example.com']],
    );
    assert.match(sent[0].text, /Cora needs your help/);
    assert.match(sent[0].text, /https:\/\/encore\.example\/inbox/);
    assert.equal(
      Number((await db.get('SELECT COUNT(*) AS count FROM notifications WHERE emailed=1'))?.count),
      2,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnvironment.key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalEnvironment.key;
    if (originalEnvironment.from === undefined) delete process.env.NOTIFICATION_FROM;
    else process.env.NOTIFICATION_FROM = originalEnvironment.from;
    if (originalEnvironment.origin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = originalEnvironment.origin;
    await db.close();
  }
});
