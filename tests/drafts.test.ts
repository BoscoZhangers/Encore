import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sharp from 'sharp';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDB, type DB } from '../server/db.js';
import { createApp } from '../server/app.js';
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;
let db: DB, app: any, seller: any, other: any, photoId: string, directory: string;
const headers = { 'X-Encore-Client': 'web' };
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'encore-drafts-'));
  process.env.DATA_DIR = directory;
  db = await openDB({ file: ':memory:' });
  app = createApp(db);
  seller = request.agent(app);
  other = request.agent(app);
  for (const [client, name] of [
    [seller, 'Seller'],
    [other, 'Other'],
  ])
    await client
      .post('/api/auth/register')
      .set(headers)
      .send({ name, email: `${name}@draft.test`, password: 'draft-test-password' })
      .expect(201);
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#ddeacc' } })
    .png()
    .toBuffer();
  photoId = (
    await seller
      .post('/api/photos')
      .set(headers)
      .attach('photo', png, { filename: 'item.png', contentType: 'image/png' })
      .expect(201)
  ).body.id;
});
after(async () => {
  await db.close();
  await rm(directory, { recursive: true, force: true });
});
const generate = (body: any, client = seller) =>
  client
    .post('/api/photo-drafts')
    .set(headers)
    .send({ photoId, ...body });
const valid = {
  subject: 'single',
  title: 'Green desk lamp',
  description: 'A green desk lamp with an adjustable arm and a round base.',
  category: 'Furniture',
  observations: ['Green finish'],
  questions: ['Does the lamp work?'],
};
async function mockModel(output: any, run: (getBody: () => string) => Promise<void>) {
  const original = globalThis.fetch;
  process.env.GEMINI_API_KEY = 'test-key';
  let body = '';
  globalThis.fetch = async (_url, options) => {
    body = String(options!.body);
    return new Response(
      JSON.stringify({
        candidates: [
          { finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output) }] } },
        ],
      }),
      { status: 200 },
    );
  };
  try {
    await run(() => body);
  } finally {
    globalThis.fetch = original;
    delete process.env.GEMINI_API_KEY;
  }
}
test('draft capability is authenticated and honestly reports no connected model', async () => {
  await request(app).get('/api/photo-drafts/capabilities').expect(401);
  assert.equal((await seller.get('/api/photo-drafts/capabilities')).body.aiAvailable, false);
  await generate({ mode: 'ai' }).expect(503);
});
test('guided drafts use seller input only and do not infer photo details', async () => {
  const r = await generate({ mode: 'guided', name: 'Desk lamp', notes: 'Bulb included.' }).expect(
    200,
  );
  assert.equal(r.body.draft.mode, 'guided');
  assert.equal(r.body.draft.category, null);
  assert.equal(r.body.draft.title, 'Desk lamp');
  assert.match(r.body.draft.description, /Bulb included/);
  assert.deepEqual(r.body.draft.observations, []);
  await generate({ mode: 'guided', name: '' }).expect(400);
});
test('other accounts cannot analyze an uploaded photo and bulk inputs are rejected', async () => {
  await generate({ mode: 'guided', name: 'Desk lamp' }, other).expect(404);
  await generate({ mode: 'guided', name: 'Desk lamp', photoIds: [photoId, photoId] }).expect(400);
  await request(app)
    .post('/api/photo-drafts')
    .set(headers)
    .send({ photoId, mode: 'ai' })
    .expect(401);
});
test('AI receives only the requested image and context; output cannot publish or change private terms', async () => {
  await mockModel(
    {
      ...valid,
      price: 1,
      floor: 0,
      facts: [{ question: 'Works?', answer: 'Yes' }],
      status: 'published',
    },
    async (getBody) => {
      const r = await generate({
        mode: 'ai',
        name: 'My lamp',
        notes: 'Small scratch on base.',
      }).expect(200);
      assert.equal(r.body.draft.title, valid.title);
      assert.equal(r.body.draft.mode, 'ai');
      for (const key of ['price', 'floor', 'facts', 'status', 'condition'])
        assert.equal(r.body.draft[key], undefined);
      assert.equal((await db.all('SELECT * FROM listings')).length, 0);
      const payload = JSON.parse(getBody());
      assert.equal(payload.contents[0].parts[0].inlineData.mimeType, 'image/webp');
      assert.match(payload.contents[0].parts[1].text, /Small scratch/);
      assert.ok(!getBody().includes('draft-test-password'));
    },
  );
});
test('multiple or unclear sale items require a new photo instead of generating a bulk listing', async () => {
  for (const subject of ['multiple', 'unclear'])
    await mockModel({ ...valid, subject }, async () => {
      await generate({ mode: 'ai' }).expect(422);
    });
});
test('invalid model responses and network failures leave the photo available for retry', async () => {
  await mockModel({ title: 'Invented but invalid' }, async () => {
    await generate({ mode: 'ai' }).expect(503);
  });
  const original = globalThis.fetch;
  process.env.GEMINI_API_KEY = 'test-key';
  globalThis.fetch = async () => {
    throw Error('offline');
  };
  try {
    await generate({ mode: 'ai' }).expect(503);
  } finally {
    globalThis.fetch = original;
    delete process.env.GEMINI_API_KEY;
  }
  await seller.get(`/api/photos/${photoId}`).expect(200);
  assert.equal((await db.all('SELECT * FROM listings')).length, 0);
});
