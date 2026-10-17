import 'dotenv/config';
import { openDB } from './db.js';
import { createApp } from './app.js';
import { deliverNotifications } from './notifications.js';
const db = await openDB({ url: process.env.DATABASE_URL });
const retentionDays = Math.max(7, Number(process.env.RETENTION_DAYS) || 90);
async function cleanup() {
  await db.run('DELETE FROM sessions WHERE expires_at<?', [Date.now()]);
  await db.run('DELETE FROM operations WHERE created_at<?', [Date.now() - 86400000]);
  await db.run('DELETE FROM notifications WHERE created_at<?', [
    Date.now() - retentionDays * 86400000,
  ]);
  await db.run(
    'DELETE FROM messages WHERE created_at<? AND conversation_id NOT IN (SELECT conversation_id FROM requests WHERE status IN (?,?))',
    [Date.now() - retentionDays * 86400000, 'pending', 'approved'],
  );
}
await cleanup();
const timer = setInterval(
  () => cleanup().catch(() => console.error('Retention cleanup failed')),
  3600000,
);
timer.unref();
let delivering = false;
const mailTimer = setInterval(async () => {
  if (delivering) return;
  delivering = true;
  try {
    await deliverNotifications(db);
  } finally {
    delivering = false;
  }
}, 15000);
mailTimer.unref();
const server = createApp(db).listen(Number(process.env.PORT) || 3001, '0.0.0.0', () =>
  console.log(
    `Encore API ready on http://localhost:${process.env.PORT || 3001} · agent: ${process.env.GEMINI_API_KEY ? 'Gemini' : 'rules (configure GEMINI_API_KEY for AI)'}`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    clearInterval(timer);
    clearInterval(mailTimer);
    server.close(() => {
      void db.close().then(() => process.exit(0));
    });
  });
