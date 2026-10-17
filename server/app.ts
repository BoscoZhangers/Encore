import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { z, ZodError } from 'zod';
import path from 'node:path';
import type { DB, Row, Query } from './db.js';
import {
  HttpError,
  id,
  hashToken,
  passwordHash,
  passwordValid,
  listingSchema,
  publicListing,
  ownerListing,
  message,
  notify,
  event,
  distanceKm,
  approveReservation,
} from './domain.js';
import { chooseDecision, executeDecision } from './agent.js';
import { storePhoto, readPhoto, deletePhoto } from './storage.js';
import { paymentIntent, verifyPayment } from './payments.js';
import { createPhotoDraft, draftInput } from './drafts.js';
import { conversationMessages, unreadMessageCount } from './messageReads.js';

declare global {
  namespace Express {
    interface Request {
      user?: Row;
    }
  }
}
const credentials = z.object({
  email: z
    .email()
    .max(200)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(10).max(128),
});
const uuid = z.string().uuid();
const publicUser = (u: Row) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  email_notifications: !!u.email_notifications,
});
export function createApp(db: DB) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '80kb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 200,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: () => process.env.NODE_ENV === 'test',
    }),
  );
  app.use('/api', (req, res, next) => {
    if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
      const origin = req.headers.origin;
      const allowed = [
        process.env.APP_ORIGIN,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
      ].filter(Boolean);
      if ((origin && !allowed.includes(origin)) || req.headers['x-encore-client'] !== 'web')
        return res.status(403).json({ error: 'Request origin could not be verified' });
    }
    next();
  });
  app.use('/api', async (req, _res, next) => {
    try {
      const token = req.cookies.encore_session;
      if (token)
        req.user = await db.get(
          'SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires_at>?',
          [hashToken(token), Date.now()],
        );
      next();
    } catch (e) {
      next(e);
    }
  });
  const auth: express.RequestHandler = (req, res, next) =>
    req.user ? next() : res.status(401).json({ error: 'Please sign in to continue' });
  const authLimiter = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    skip: () => process.env.NODE_ENV === 'test',
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  async function session(res: express.Response, user: Row) {
    const token = randomBytes(32).toString('hex');
    await db.run('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)', [
      hashToken(token),
      user.id,
      Date.now() + 7 * 86400000,
    ]);
    res.cookie('encore_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 86400000,
      path: '/',
    });
  }
  app.get('/api/health', async (_req, res) => {
    await db.ping();
    res.json({
      ok: true,
      agent: process.env.GEMINI_API_KEY ? 'gemini' : 'rules',
      payments: 'devnet',
      database: db.kind,
      databaseReady: true,
    });
  });
  app.get('/api/auth/me', (req, res) => res.json({ user: req.user ? publicUser(req.user) : null }));
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const data = credentials.extend({ name: z.string().trim().min(2).max(60) }).parse(req.body);
    const user = {
      id: id(),
      name: data.name,
      email: data.email,
      password: passwordHash(data.password),
      created_at: Date.now(),
    };
    try {
      await db.run(
        'INSERT INTO users(id,name,email,password,created_at) VALUES(?,?,?,?,?)',
        Object.values(user),
      );
    } catch (e: any) {
      if (e.code === '23505' || String(e.message).includes('UNIQUE'))
        throw new HttpError(409, 'An account with this email already exists');
      throw e;
    }
    await session(res, user);
    res.status(201).json({ user: publicUser(user) });
  });
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const data = credentials.parse(req.body);
    const user = await db.get('SELECT * FROM users WHERE email=?', [data.email]);
    if (!user || !passwordValid(data.password, user.password))
      throw new HttpError(401, 'Email or password is incorrect');
    await session(res, user);
    res.json({ user: publicUser(user) });
  });
  app.post('/api/auth/logout', async (req, res) => {
    if (req.cookies.encore_session)
      await db.run('DELETE FROM sessions WHERE token=?', [hashToken(req.cookies.encore_session)]);
    res.clearCookie('encore_session', { path: '/' });
    res.json({ ok: true });
  });
  app.patch('/api/account/preferences', auth, async (req, res) => {
    const enabled = z.boolean().parse(req.body.email_notifications);
    await db.run('UPDATE users SET email_notifications=? WHERE id=?', [
      enabled ? 1 : 0,
      req.user!.id,
    ]);
    res.json({ ok: true });
  });
  app.get('/api/account/profile', auth, async (req, res) => {
    const profile = await db.get('SELECT photo_id FROM profiles WHERE user_id=?', [req.user!.id]);
    res.json({
      avatar_url: profile ? `/api/photos/${profile.photo_id}` : null,
    });
  });
  app.patch('/api/account/profile', auth, async (req, res) => {
    const { photoId } = z.object({ photoId: uuid.nullable() }).parse(req.body);
    await db.transaction(async (q) => {
      if (photoId === null) {
        await q.run('DELETE FROM profiles WHERE user_id=?', [req.user!.id]);
      } else {
        if (
          !(await q.get('SELECT id FROM photos WHERE id=? AND user_id=?', [photoId, req.user!.id]))
        )
          throw new HttpError(400, 'Choose a photo from your own account');
        await q.run(
          'INSERT INTO profiles(user_id,photo_id) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET photo_id=excluded.photo_id',
          [req.user!.id, photoId],
        );
      }
    });
    res.json({ avatar_url: photoId ? `/api/photos/${photoId}` : null });
  });
  app.delete('/api/account', auth, async (req, res) => {
    const password = z.string().min(1).max(128).parse(req.body.password);
    if (!passwordValid(password, req.user!.password))
      throw new HttpError(403, 'Password is incorrect');
    const ownedPhotos = await db.all('SELECT * FROM photos WHERE user_id=?', [req.user!.id]);
    await db.transaction(async (q) => {
      const active = await q.get(
        "SELECT r.id FROM requests r JOIN listings l ON l.id=r.listing_id WHERE r.status='approved' AND (r.buyer_id=? OR l.seller_id=?)",
        [req.user!.id, req.user!.id],
      );
      if (active)
        throw new HttpError(409, 'Resolve approved reservations before deleting your account');
      await q.run('DELETE FROM users WHERE id=?', [req.user!.id]);
    });
    for (const p of ownedPhotos) await deletePhoto(p.id, p.storage);
    res.clearCookie('encore_session', { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/listings', async (req, res) => {
    const f = z
      .object({
        scope: z.enum(['mine', 'others']).optional(),
        condition: z.enum(['New', 'Like new', 'Good', 'Fair', 'For parts']).optional(),
        sort: z.enum(['newest', 'closest', 'price-low', 'price-high']).optional(),
        stage: z.enum(['all', 'active', 'negotiating', 'sold']).optional(),
        q: z.string().max(100).optional(),
        category: z.string().max(40).optional(),
        area: z.string().max(100).optional(),
        min: z.coerce.number().min(0).optional(),
        max: z.coerce.number().min(0).optional(),
        lat: z.coerce.number().min(-90).max(90).optional(),
        lng: z.coerce.number().min(-180).max(180).optional(),
        radius: z.coerce.number().positive().max(500).optional(),
      })
      .parse(req.query);
    if (f.scope === 'mine' && !req.user) throw new HttpError(401, 'Sign in to see your listings');
    if ((f.lat === undefined) !== (f.lng === undefined))
      throw new HttpError(400, 'Provide both location coordinates');
    if (
      (f.sort === 'closest' || f.radius !== undefined) &&
      (f.lat === undefined || f.lng === undefined)
    )
      throw new HttpError(400, 'Choose a location to find nearby items');
    if (f.min !== undefined && f.max !== undefined && f.min > f.max)
      throw new HttpError(400, 'Minimum price must not exceed maximum price');
    const access: string[] = [];
    const accessArgs: unknown[] = [];
    if (f.scope === 'mine') {
      access.push('l.seller_id=?');
      accessArgs.push(req.user!.id);
    } else if (f.scope === 'others' && req.user) {
      access.push('l.seller_id<>?');
      accessArgs.push(req.user.id);
      access.push(`(
        l.quantity-l.reserved-l.sold>0 OR EXISTS (
          SELECT 1 FROM requests visible_request
          WHERE visible_request.listing_id=l.id
            AND visible_request.buyer_id=?
            AND visible_request.status IN ('approved','completed')
        )
      )`);
      accessArgs.push(req.user.id);
    } else {
      access.push('l.quantity-l.reserved-l.sold>0');
    }
    const rows = await db.all(
      `SELECT l.*,u.name AS seller_name,
       (SELECT p.photo_id FROM profiles p WHERE p.user_id=l.seller_id) AS avatar_photo_id,
       (SELECT COUNT(*) FROM listing_views v WHERE v.listing_id=l.id) AS views,
       CASE WHEN l.sold=l.quantity THEN 'sold'
            WHEN EXISTS (SELECT 1 FROM requests r WHERE r.listing_id=l.id AND r.kind='offer' AND r.status IN ('pending','approved')) THEN 'negotiating'
            ELSE 'active' END AS market_status
       FROM listings l JOIN users u ON u.id=l.seller_id
       WHERE l.status='published' AND ${access.join(' AND ')}
       ORDER BY l.created_at DESC LIMIT 500`,
      accessArgs,
    );
    const results = rows
      .map((r) => {
        const item = publicListing(r);
        return {
          ...item,
          ...(f.stage ? { market_status: r.market_status } : {}),
          distance:
            f.lat !== undefined && f.lng !== undefined && r.latitude !== null
              ? distanceKm(f.lat, f.lng, r.latitude, r.longitude)
              : null,
        };
      })
      .filter(
        (r) =>
          (!f.stage || f.stage === 'all' || r.market_status === f.stage) &&
          (!f.q || `${r.title} ${r.description}`.toLowerCase().includes(f.q.toLowerCase())) &&
          (!f.condition || r.condition === f.condition) &&
          (!f.category || r.category === f.category) &&
          (!f.area || r.area.toLowerCase().includes(f.area.toLowerCase())) &&
          (f.min === undefined || r.price >= f.min * 100) &&
          (f.max === undefined || r.price <= f.max * 100) &&
          (!f.radius || (r.distance !== null && r.distance <= f.radius)),
      );
    if (f.sort === 'price-low') results.sort((a, b) => a.price - b.price);
    else if (f.sort === 'price-high') results.sort((a, b) => b.price - a.price);
    else if (f.sort === 'closest' || (!f.sort && f.lat !== undefined))
      results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    res.json({ listings: results });
  });
  app.get('/api/seller/listings', auth, async (req, res) =>
    res.json({
      listings: (
        await db.all(
          'SELECT l.*, (SELECT COUNT(*) FROM listing_views v WHERE v.listing_id=l.id) AS views FROM listings l WHERE seller_id=? ORDER BY created_at DESC',
          [req.user!.id],
        )
      ).map(ownerListing),
    }),
  );
  app.get('/api/listings/:id', async (req, res) => {
    const row = await db.get(
      'SELECT l.*,u.name AS seller_name, (SELECT p.photo_id FROM profiles p WHERE p.user_id=l.seller_id) AS avatar_photo_id, (SELECT COUNT(*) FROM listing_views v WHERE v.listing_id=l.id) AS views FROM listings l JOIN users u ON u.id=l.seller_id WHERE l.id=?',
      [req.params.id],
    );
    if (!row || (row.status !== 'published' && row.seller_id !== req.user?.id))
      throw new HttpError(404, 'Listing not found');
    const unavailable = row.quantity - row.reserved - row.sold <= 0;
    const participant =
      unavailable && req.user && row.seller_id !== req.user.id
        ? await db.get(
            `SELECT 1 FROM requests
             WHERE listing_id=? AND buyer_id=? AND status IN ('approved','completed') LIMIT 1`,
            [row.id, req.user.id],
          )
        : null;
    if (unavailable && row.seller_id !== req.user?.id && !participant)
      throw new HttpError(404, 'Listing not found');
    res.json({ listing: publicListing(row) });
  });
  // Explicit page-open event: fetching or polling a listing never increases its views.
  app.post('/api/listings/:id/views', async (req, res) => {
    const { visitorId } = z.object({ visitorId: uuid }).parse(req.body);
    const listingId = uuid.parse(req.params.id);
    const views = await db.transaction(async (q) => {
      const listing = await q.get('SELECT seller_id,status FROM listings WHERE id=?', [listingId]);
      if (!listing || (listing.status !== 'published' && listing.seller_id !== req.user?.id))
        throw new HttpError(404, 'Listing not found');
      if (listing.status === 'published' && listing.seller_id !== req.user?.id) {
        const day = new Date().toISOString().slice(0, 10);
        const viewer = req.user ? `user:${req.user.id}` : `browser:${visitorId}`;
        // Scope the anonymous hash to this item and day; never store raw visitor IDs.
        const key = hashToken(`${listingId}:${day}:${viewer}`);
        await q.run(
          'INSERT INTO listing_views(listing_id,viewer_key,created_at) VALUES(?,?,?) ON CONFLICT(listing_id,viewer_key) DO NOTHING',
          [listingId, key, Date.now()],
        );
      }
      return Number(
        (await q.get('SELECT COUNT(*) AS views FROM listing_views WHERE listing_id=?', [
          listingId,
        ]))!.views,
      );
    });
    res.json({ views });
  });
  async function validatePhotos(q: Query, photos: string[], user: string) {
    for (const photo of photos)
      if (!(await q.get('SELECT id FROM photos WHERE id=? AND user_id=?', [photo, user])))
        throw new HttpError(400, 'One of the photos does not belong to this account');
  }
  async function saveListing(req: express.Request, listingId?: string) {
    const data = listingSchema.parse(req.body);
    if (data.wallet) {
      const { PublicKey } = await import('@solana/web3.js');
      try {
        if (!PublicKey.isOnCurve(new PublicKey(data.wallet).toBytes())) throw new Error();
      } catch {
        throw new HttpError(400, 'Enter a valid standard Solana wallet address');
      }
    }
    if (data.sol_lamports && !data.wallet)
      throw new HttpError(400, 'A wallet is required for test-SOL payments');
    const user = req.user!;
    const key = listingId || id();
    return db.transaction(async (q) => {
      await validatePhotos(q, data.photos, user.id);
      const existing = listingId
        ? await q.get('SELECT * FROM listings WHERE id=? AND seller_id=?', [key, user.id])
        : null;
      if (listingId && !existing) throw new HttpError(404, 'Listing not found');
      if (existing && data.quantity < existing.reserved + existing.sold)
        throw new HttpError(409, 'Quantity cannot be smaller than reserved plus sold stock');
      const values = [
        data.title,
        data.description,
        data.category,
        data.condition,
        data.price,
        data.floor,
        data.quantity,
        data.status,
        data.area,
        data.latitude === null ? null : Math.round(data.latitude * 100) / 100,
        data.longitude === null ? null : Math.round(data.longitude * 100) / 100,
        data.pickup,
        JSON.stringify(data.photos),
        JSON.stringify(data.facts),
        data.private_notes,
        data.contact,
        data.share_contact ? 1 : 0,
        data.wallet,
        data.sol_lamports,
        Date.now(),
      ];
      if (existing)
        await q.run(
          'UPDATE listings SET title=?,description=?,category=?,condition=?,price=?,floor=?,quantity=?,status=?,area=?,latitude=?,longitude=?,pickup=?,photos=?,facts=?,private_notes=?,contact=?,share_contact=?,wallet=?,sol_lamports=?,updated_at=? WHERE id=?',
          [...values, key],
        );
      else
        await q.run(
          'INSERT INTO listings(title,description,category,condition,price,floor,quantity,status,area,latitude,longitude,pickup,photos,facts,private_notes,contact,share_contact,wallet,sol_lamports,updated_at,id,seller_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [...values, key, user.id, Date.now()],
        );
      if (!existing)
        await notify(
          q,
          user.id,
          `Your listing “${data.title}” has been created${data.status === 'published' ? ' and published' : ' as a draft'}.`,
          `/items/${key}?from=listings`,
        );
      if (data.status === 'published' && existing?.status !== 'published')
        await event(q, user.id, 'listing_published');
      return ownerListing((await q.get('SELECT * FROM listings WHERE id=?', [key]))!);
    });
  }
  app.post('/api/listings', auth, async (req, res) =>
    res.status(201).json({ listing: await saveListing(req) }),
  );
  app.patch('/api/listings/:id', auth, async (req, res) =>
    res.json({ listing: await saveListing(req, String(req.params.id)) }),
  );
  app.delete('/api/listings/:id', auth, async (req, res) => {
    await db.transaction(async (q) => {
      const listing = await q.get('SELECT * FROM listings WHERE id=? AND seller_id=?', [
        req.params.id,
        req.user!.id,
      ]);
      if (!listing) throw new HttpError(404, 'Listing not found');
      if (listing.reserved > 0)
        throw new HttpError(409, 'Resolve reservations before deleting this listing');
      await q.run('DELETE FROM listings WHERE id=?', [listing.id]);
    });
    res.json({ ok: true });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  });
  app.post('/api/photos', auth, upload.single('photo'), async (req, res) => {
    if (!req.file || !['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype))
      throw new HttpError(400, 'Choose a JPG, PNG, or WebP photo under 8 MB');
    const key = id();
    let storage;
    try {
      storage = await storePhoto(key, req.file.buffer);
    } catch {
      throw new HttpError(400, 'The image could not be processed');
    }
    await db.run('INSERT INTO photos(id,user_id,storage,created_at) VALUES(?,?,?,?)', [
      key,
      req.user!.id,
      storage,
      Date.now(),
    ]);
    res.status(201).json({ id: key, url: `/api/photos/${key}` });
  });
  app.get('/api/photo-drafts/capabilities', auth, (_req, res) =>
    res.json({ aiAvailable: !!process.env.GEMINI_API_KEY }),
  );
  app.post(
    '/api/photo-drafts',
    auth,
    rateLimit({
      windowMs: 60000,
      limit: 6,
      skip: () => process.env.NODE_ENV === 'test',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
    async (req, res) => {
      const input = draftInput.parse(req.body);
      const photo = await db.get('SELECT * FROM photos WHERE id=? AND user_id=?', [
        input.photoId,
        req.user!.id,
      ]);
      if (!photo) throw new HttpError(404, 'Photo not found');
      const draft = await createPhotoDraft(
        input.mode === 'ai' ? await readPhoto(photo.id, photo.storage) : Buffer.alloc(0),
        input,
      );
      // Suggestions only: never create a listing, publish, or add confirmed facts here.
      res.json({ draft, photoId: photo.id });
    },
  );
  app.get('/api/photos/:id', async (req, res) => {
    uuid.parse(req.params.id);
    const p = await db.get('SELECT * FROM photos WHERE id=?', [req.params.id]);
    if (!p) throw new HttpError(404, 'Photo not found');
    if (p.user_id !== req.user?.id) {
      const items = await db.all(
        "SELECT photos FROM listings WHERE seller_id=? AND status='published'",
        [p.user_id],
      );
      const profile = await db.get('SELECT user_id FROM profiles WHERE user_id=? AND photo_id=?', [
        p.user_id,
        p.id,
      ]);
      if (!profile && !items.some((x) => JSON.parse(x.photos).includes(p.id)))
        throw new HttpError(404, 'Photo not found');
    }
    res
      .type('webp')
      .set('Cache-Control', 'private, max-age=60')
      .send(await readPhoto(p.id, p.storage));
  });
  app.post('/api/conversations', auth, async (req, res) => {
    const listingId = uuid.parse(req.body.listingId);
    const listing = await db.get("SELECT * FROM listings WHERE id=? AND status='published'", [
      listingId,
    ]);
    if (!listing) throw new HttpError(404, 'Listing not found');
    if (listing.seller_id === req.user!.id)
      throw new HttpError(400, 'Use a buyer account to start a conversation on your own listing');
    if (
      await db.get('SELECT * FROM blocks WHERE seller_id=? AND buyer_id=?', [
        listing.seller_id,
        req.user!.id,
      ])
    )
      throw new HttpError(403, 'This conversation is unavailable');
    let conversation = await db.get(
      'SELECT * FROM conversations WHERE listing_id=? AND buyer_id=?',
      [listingId, req.user!.id],
    );
    if (!conversation && listing.quantity - listing.reserved - listing.sold <= 0)
      throw new HttpError(404, 'Listing not found');
    if (!conversation) {
      const newId = id();
      await db.run(
        'INSERT INTO conversations(id,listing_id,buyer_id,created_at) VALUES(?,?,?,?) ON CONFLICT(listing_id,buyer_id) DO NOTHING',
        [newId, listingId, req.user!.id, Date.now()],
      );
      conversation = await db.get('SELECT * FROM conversations WHERE listing_id=? AND buyer_id=?', [
        listingId,
        req.user!.id,
      ]);
      if (conversation!.id === newId) {
        await message(
          db,
          newId,
          'agent',
          'Hi! I’m Cora, the seller’s assistant. I answer using seller-confirmed details and ask the seller when something is uncertain. Offers need seller approval.',
        );
        await event(db, listing.seller_id, 'buyer_conversation');
      }
    }
    res.json({ conversation });
  });
  async function getConversation(q: Query, key: string, userId: string) {
    const c = await q.get(
      'SELECT c.*,l.seller_id,l.title,buyer.name AS buyer_name,seller.name AS seller_name FROM conversations c JOIN listings l ON l.id=c.listing_id JOIN users buyer ON buyer.id=c.buyer_id JOIN users seller ON seller.id=l.seller_id WHERE c.id=?',
      [key],
    );
    if (!c || (c.buyer_id !== userId && c.seller_id !== userId))
      throw new HttpError(404, 'Conversation not found');
    return c;
  }
  app.get('/api/conversations', auth, async (req, res) =>
    res.json({
      conversations: await db.all(
        'SELECT c.*,l.title,l.seller_id,u.name AS buyer_name FROM conversations c JOIN listings l ON l.id=c.listing_id JOIN users u ON u.id=c.buyer_id WHERE c.buyer_id=? OR l.seller_id=? ORDER BY c.created_at DESC',
        [req.user!.id, req.user!.id],
      ),
    }),
  );
  app.get('/api/conversations/unread', auth, async (req, res) => {
    res.json({ unread: await unreadMessageCount(db, req.user!.id) });
  });
  app.post('/api/conversations/:id/read', auth, async (req, res) => {
    const { messageIds } = z.object({ messageIds: z.array(uuid).min(1).max(500) }).parse(req.body);
    await db.transaction(async (q) => {
      const c = await getConversation(q, String(req.params.id), req.user!.id);
      // Only acknowledge messages actually displayed, not newer messages arriving in flight.
      const { unreadMessageIds } = await conversationMessages(q, c, req.user!.id);
      const incoming = new Set(unreadMessageIds);
      for (const messageId of new Set(messageIds)) {
        if (incoming.has(messageId))
          await q.run(
            'INSERT INTO message_reads(user_id,message_id) VALUES(?,?) ON CONFLICT(user_id,message_id) DO NOTHING',
            [req.user!.id, messageId],
          );
      }
    });
    res.json({ ok: true });
  });
  app.get('/api/conversations/:id', auth, async (req, res) => {
    const c = await getConversation(db, String(req.params.id), req.user!.id);
    const profiles = await db.all('SELECT user_id,photo_id FROM profiles WHERE user_id IN (?,?)', [
      c.buyer_id,
      c.seller_id,
    ]);
    const avatar = (userId: string) => {
      const profile = profiles.find((p) => p.user_id === userId);
      return profile ? `/api/photos/${profile.photo_id}` : null;
    };
    const listing = (await db.get('SELECT * FROM listings WHERE id=?', [c.listing_id]))!;
    const requests = await db.all(
      'SELECT id,kind,amount,quantity,status,signature,created_at FROM requests WHERE conversation_id=? ORDER BY created_at DESC',
      [c.id],
    );
    res.json({
      conversation: {
        ...c,
        buyer_avatar_url: avatar(c.buyer_id),
        seller_avatar_url: avatar(c.seller_id),
      },
      listing: publicListing(listing),
      ...(await conversationMessages(db, c, req.user!.id)),
      requests,
      paymentEnabled: !!listing.wallet && Number(listing.sol_lamports) > 0,
      agentMode: process.env.GEMINI_API_KEY ? 'gemini' : 'rules',
    });
  });
  const conversationLocks = new Map<string, Promise<any>>();
  app.post(
    '/api/conversations/:id/messages',
    auth,
    rateLimit({
      windowMs: 60000,
      limit: 15,
      skip: () => process.env.NODE_ENV === 'test',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
    async (req, res) => {
      const data = z
        .object({
          text: z.string().trim().min(1).max(1500),
          key: z.string().uuid(),
        })
        .parse(req.body);
      const user = req.user!;
      const key = String(req.params.id);
      const fingerprint = hashToken(key + '|' + data.text);
      const operationId = `message:${data.key}`;
      const previous = conversationLocks.get(key) || Promise.resolve();
      const run = previous
        .catch(() => {})
        .then(async () => {
          const prior = await db.get('SELECT * FROM operations WHERE user_id=? AND key=?', [
            user.id,
            operationId,
          ]);
          if (prior) {
            if (prior.fingerprint !== fingerprint)
              throw new HttpError(409, 'This message key was already used');
            return JSON.parse(prior.result);
          }
          const c = await getConversation(db, key, user.id);
          if (c.buyer_id !== user.id)
            throw new HttpError(403, 'Seller replies are sent through the inbox');
          if (
            await db.get('SELECT * FROM blocks WHERE seller_id=? AND buyer_id=?', [
              c.seller_id,
              user.id,
            ])
          )
            throw new HttpError(403, 'This conversation is unavailable');
          const listing = (await db.get('SELECT * FROM listings WHERE id=?', [c.listing_id]))!;
          const history = await db.all(
            'SELECT role,body FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 8',
            [c.id],
          );
          const result = await chooseDecision(listing, data.text, history.reverse());
          return db.transaction(async (q) => {
            const repeated = await q.get('SELECT * FROM operations WHERE user_id=? AND key=?', [
              user.id,
              operationId,
            ]);
            if (repeated) {
              if (repeated.fingerprint !== fingerprint)
                throw new HttpError(409, 'Message key was reused');
              return JSON.parse(repeated.result);
            }
            const current = (await q.get('SELECT * FROM listings WHERE id=?', [listing.id]))!;
            await message(q, c.id, 'buyer', data.text);
            const response = await executeDecision(q, current, c, data.text, result.decision);
            const payload = { message: response, mode: result.mode };
            await q.run(
              'INSERT INTO operations(user_id,key,fingerprint,result,created_at) VALUES(?,?,?,?,?)',
              [user.id, operationId, fingerprint, JSON.stringify(payload), Date.now()],
            );
            await event(
              q,
              c.seller_id,
              result.mode === 'unavailable' ? 'model_failure' : 'agent_reply',
            );
            return payload;
          });
        });
      conversationLocks.set(key, run);
      try {
        res.json(await run);
      } finally {
        if (conversationLocks.get(key) === run) conversationLocks.delete(key);
      }
    },
  );
  app.get('/api/seller/activity', auth, async (req, res) => {
    const sellerId = req.user!.id;
    const pending = await db.all(
      `SELECT r.id,r.kind,r.amount,r.quantity,r.created_at,l.title,l.price,r.conversation_id
       FROM requests r JOIN listings l ON l.id=r.listing_id
       WHERE l.seller_id=? AND r.status='pending'
       ORDER BY r.created_at DESC,r.id DESC LIMIT 3`,
      [sellerId],
    );
    const replies = await db.all(
      `SELECT m.id,m.created_at,l.title,c.id AS conversation_id
       FROM messages m JOIN conversations c ON c.id=m.conversation_id
       JOIN listings l ON l.id=c.listing_id
       WHERE l.seller_id=? AND m.role='agent'
       AND EXISTS (SELECT 1 FROM messages b WHERE b.conversation_id=c.id AND b.role='buyer' AND b.created_at<=m.created_at)
       AND NOT EXISTS (SELECT 1 FROM requests r WHERE r.conversation_id=c.id AND r.status='pending')
       AND NOT EXISTS (SELECT 1 FROM requests r WHERE r.conversation_id=c.id AND r.status='completed')
       AND NOT EXISTS (SELECT 1 FROM messages newer WHERE newer.conversation_id=c.id AND newer.role='agent'
         AND (newer.created_at>m.created_at OR (newer.created_at=m.created_at AND newer.id>m.id)))
       ORDER BY m.created_at DESC,m.id DESC LIMIT 3`,
      [sellerId],
    );
    const sales = await db.all(
      `SELECT r.id,r.amount,r.quantity,l.title,r.conversation_id,s.created_at
       FROM requests r JOIN listings l ON l.id=r.listing_id
       LEFT JOIN sale_completions s ON s.request_id=r.id
       WHERE l.seller_id=? AND r.status='completed'
       ORDER BY COALESCE(s.created_at,0) DESC,r.id DESC LIMIT 3`,
      [sellerId],
    );
    res.json({
      activity: [
        ...pending.map((r) => ({
          id: r.id,
          kind: r.kind,
          title: r.title,
          amount: r.amount == null ? null : Number(r.amount),
          askingPrice: Number(r.price),
          quantity: Number(r.quantity),
          createdAt: Number(r.created_at),
          href: '/inbox',
        })),
        ...[
          ...sales.map((r) => ({
            id: r.id,
            kind: 'sale',
            title: r.title,
            amount: Number(r.amount) * Number(r.quantity),
            quantity: Number(r.quantity),
            createdAt: r.created_at == null ? null : Number(r.created_at),
            href: `/messages/${r.conversation_id}`,
          })),
          ...replies.map((r) => ({
            id: r.id,
            kind: 'reply',
            title: r.title,
            createdAt: Number(r.created_at),
            href: `/messages/${r.conversation_id}`,
          })),
        ].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
      ].slice(0, 3),
    });
  });
  app.get('/api/seller/requests', auth, async (req, res) =>
    res.json({
      requests: await db.all(
        'SELECT r.*,l.title,u.name AS buyer_name,l.floor FROM requests r JOIN listings l ON l.id=r.listing_id JOIN users u ON u.id=r.buyer_id WHERE l.seller_id=? ORDER BY r.created_at DESC',
        [req.user!.id],
      ),
    }),
  );
  app.post('/api/requests/:id/answer', auth, async (req, res) => {
    const body = z
      .object({
        answer: z.string().trim().min(1).max(800),
        remember: z.boolean(),
      })
      .parse(req.body);
    await db.transaction(async (q) => {
      const r = await q.get(
        'SELECT r.*,l.seller_id,l.facts FROM requests r JOIN listings l ON l.id=r.listing_id WHERE r.id=?',
        [req.params.id],
      );
      if (!r || r.seller_id !== req.user!.id) throw new HttpError(404, 'Request not found');
      if (r.kind !== 'question' || r.status !== 'pending')
        throw new HttpError(409, 'This question has already been handled');
      await q.run("UPDATE requests SET answer=?,status='answered' WHERE id=?", [body.answer, r.id]);
      if (body.remember) {
        const facts = JSON.parse(r.facts);
        if (facts.length >= 40) throw new HttpError(400, 'This listing already has 40 saved facts');
        facts.push({ id: id(), question: r.question, answer: body.answer });
        await q.run('UPDATE listings SET facts=?,updated_at=? WHERE id=?', [
          JSON.stringify(facts),
          Date.now(),
          r.listing_id,
        ]);
      }
      await message(q, r.conversation_id, 'seller', `Regarding “${r.question}”: ${body.answer}`);
      await notify(
        q,
        r.buyer_id,
        'The seller answered your question.',
        `/messages/${r.conversation_id}`,
      );
      await event(q, req.user!.id, 'seller_answer');
    });
    res.json({ ok: true });
  });
  app.post('/api/requests/:id/approve', auth, async (req, res) =>
    res.json(
      await db.transaction((q) => approveReservation(q, String(req.params.id), req.user!.id)),
    ),
  );
  app.post('/api/requests/:id/:action', auth, async (req, res, next) => {
    if (!['decline', 'cancel', 'complete'].includes(String(req.params.action))) return next();
    await db.transaction(async (q) => {
      const r = await q.get(
        'SELECT r.*,l.seller_id,l.title FROM requests r JOIN listings l ON l.id=r.listing_id WHERE r.id=?',
        [req.params.id],
      );
      if (
        !r ||
        (r.seller_id !== req.user!.id &&
          !(req.params.action === 'cancel' && r.buyer_id === req.user!.id))
      )
        throw new HttpError(404, 'Request not found');
      const action = req.params.action;
      if (
        r.kind !== 'offer' ||
        (action === 'decline' ? r.status !== 'pending' : r.status !== 'approved')
      )
        throw new HttpError(409, 'This action is not available');
      const nextStatus =
        action === 'complete' ? 'completed' : action === 'decline' ? 'declined' : 'cancelled';
      const changed = await q.run('UPDATE requests SET status=? WHERE id=? AND status=?', [
        nextStatus,
        r.id,
        r.status,
      ]);
      if (!changed) throw new HttpError(409, 'Reservation was already handled');
      if (action === 'complete')
        await q.run('INSERT INTO sale_completions(request_id,created_at) VALUES(?,?)', [
          r.id,
          Date.now(),
        ]);
      if (action !== 'decline')
        await q.run('UPDATE listings SET reserved=reserved-?,sold=sold+?,updated_at=? WHERE id=?', [
          r.quantity,
          action === 'complete' ? r.quantity : 0,
          Date.now(),
          r.listing_id,
        ]);
      await message(
        q,
        r.conversation_id,
        req.user!.id === r.buyer_id ? 'buyer' : 'seller',
        action === 'complete'
          ? 'The seller marked this sale completed. Thank you for giving it another chapter.'
          : `This reservation request was ${nextStatus}.`,
      );
      await notify(q, r.buyer_id, `Reservation ${nextStatus}.`, `/messages/${r.conversation_id}`);
      if (action === 'complete')
        await notify(
          q,
          r.seller_id,
          `Sale completed for ${r.title}: CAD ${((Number(r.amount) * Number(r.quantity)) / 100).toFixed(2)} earned.`,
          `/messages/${r.conversation_id}`,
        );
      await event(q, r.seller_id, `reservation_${nextStatus}`);
    });
    res.json({ ok: true });
  });
  app.post('/api/requests/:id/payment-intent', auth, async (req, res) =>
    res.json(
      await paymentIntent(
        db,
        String(req.params.id),
        req.user!.id,
        z.string().min(32).max(50).parse(req.body.payer),
      ),
    ),
  );
  app.post('/api/requests/:id/payment-verify', auth, async (req, res) =>
    res.json(
      await verifyPayment(
        db,
        String(req.params.id),
        req.user!.id,
        z.string().min(64).max(100).parse(req.body.signature),
      ),
    ),
  );
  app.get('/api/notifications', auth, async (req, res) =>
    res.json({
      notifications: await db.all(
        'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
        [req.user!.id],
      ),
    }),
  );
  app.post('/api/notifications/read', auth, async (req, res) => {
    await db.run('UPDATE notifications SET seen=1 WHERE user_id=?', [req.user!.id]);
    res.json({ ok: true });
  });
  app.post('/api/reports', auth, async (req, res) => {
    const data = z
      .object({
        listingId: z.string().uuid(),
        reason: z.string().trim().min(5).max(1000),
      })
      .parse(req.body);
    if (!(await db.get('SELECT id FROM listings WHERE id=?', [data.listingId])))
      throw new HttpError(404, 'Listing not found');
    await db.run('INSERT INTO reports(id,user_id,listing_id,reason,created_at) VALUES(?,?,?,?,?)', [
      id(),
      req.user!.id,
      data.listingId,
      data.reason,
      Date.now(),
    ]);
    res.json({ ok: true });
  });
  app.post('/api/blocks', auth, async (req, res) => {
    const buyerId = uuid.parse(req.body.buyerId);
    const convo = await db.get(
      'SELECT c.id FROM conversations c JOIN listings l ON l.id=c.listing_id WHERE l.seller_id=? AND c.buyer_id=?',
      [req.user!.id, buyerId],
    );
    if (!convo) throw new HttpError(404, 'Buyer not found');
    await db.run(
      'INSERT INTO blocks(seller_id,buyer_id) VALUES(?,?) ON CONFLICT(seller_id,buyer_id) DO NOTHING',
      [req.user!.id, buyerId],
    );
    res.json({ ok: true });
  });
  app.delete('/api/blocks/:id', auth, async (req, res) => {
    await db.run('DELETE FROM blocks WHERE seller_id=? AND buyer_id=?', [
      req.user!.id,
      req.params.id,
    ]);
    res.json({ ok: true });
  });
  app.get('/api/blocks', auth, async (req, res) =>
    res.json({
      blocks: await db.all(
        'SELECT b.buyer_id,u.name FROM blocks b JOIN users u ON u.id=b.buyer_id WHERE b.seller_id=?',
        [req.user!.id],
      ),
    }),
  );
  app.get('/api/seller/metrics', auth, async (req, res) => {
    const user = req.user!.id;
    const events = await db.all(
      'SELECT name,COUNT(*) AS count FROM events WHERE user_id=? GROUP BY name',
      [user],
    );
    const totals = await db.get(
      "SELECT COALESCE(SUM(r.amount*r.quantity),0) AS proceeds,COALESCE(SUM(r.quantity),0) AS units FROM requests r JOIN listings l ON l.id=r.listing_id WHERE l.seller_id=? AND r.status='completed'",
      [user],
    );
    res.json({
      events,
      proceeds: Number(totals?.proceeds || 0),
      units: Number(totals?.units || 0),
      source: 'seller-confirmed sales',
    });
  });
  app.get('/api/seller/insights', auth, async (req, res) => {
    const period = String(req.query.period || 'month');
    if (!['month', 'previous-month', 'all-time'].includes(period))
      throw new HttpError(400, 'Choose a supported insights period');
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).getTime();
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).getTime();
    const previousStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    ).getTime();
    const selectedStart = period === 'month' ? monthStart : previousStart;
    const selectedEnd = period === 'month' ? monthEnd : monthStart;
    const user = req.user!.id;
    const active = await db.get(
      "SELECT COUNT(*) AS count FROM listings WHERE seller_id=? AND status='published' AND quantity>reserved+sold",
      [user],
    );
    const query = `SELECT COALESCE(SUM(CASE WHEN r.status='completed' THEN r.amount*r.quantity ELSE 0 END),0) AS earnings, COALESCE(SUM(CASE WHEN r.status='completed' THEN r.quantity ELSE 0 END),0) AS rehomed, COALESCE(SUM(CASE WHEN r.kind='offer' THEN 1 ELSE 0 END),0) AS negotiations FROM requests r JOIN listings l ON l.id=r.listing_id WHERE l.seller_id=?${period === 'all-time' ? '' : ' AND r.created_at>=? AND r.created_at<?'}`;
    const selectedArgs = period === 'all-time' ? [user] : [user, selectedStart, selectedEnd];
    const month = await db.get(query, selectedArgs);
    const previous =
      period === 'all-time'
        ? null
        : await db.get(query, [user, previousStart - (monthEnd - monthStart), previousStart]);
    const trend = (key: 'earnings' | 'rehomed' | 'negotiations') =>
      Number(month?.[key] || 0) - Number(previous?.[key] || 0);
    res.json({
      period,
      start: period === 'all-time' ? null : selectedStart,
      end: period === 'all-time' ? null : selectedEnd,
      totalEarnings: Number(month?.earnings || 0),
      activeListings: Number(active?.count || 0),
      agentNegotiations: Number(month?.negotiations || 0),
      rehomedItems: Number(month?.rehomed || 0),
      changes: {
        totalEarnings: period === 'all-time' ? 0 : trend('earnings'),
        activeListings: 0,
        agentNegotiations: period === 'all-time' ? 0 : trend('negotiations'),
        rehomedItems: period === 'all-time' ? 0 : trend('rehomed'),
      },
    });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError)
      return res.status(400).json({ error: err.issues.map((i) => i.message).join('; ') });
    if (err instanceof multer.MulterError)
      return res.status(400).json({ error: 'Photo upload exceeded its limits' });
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error('Request failed:', err?.name || 'Error', err?.code || '');
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
