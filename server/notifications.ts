import type { DB } from './db.js';
export async function deliverNotifications(db: DB) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM || !process.env.APP_ORIGIN)
    return;
  const jobs = await db.all(
    'SELECT n.*,u.email FROM notifications n JOIN users u ON u.id=n.user_id WHERE n.emailed=0 AND u.email_notifications=1 ORDER BY n.created_at LIMIT 20',
  );
  for (const job of jobs) {
    try {
      const url = new URL(job.href, process.env.APP_ORIGIN).toString();
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `encore-notification-${job.id}`,
        },
        body: JSON.stringify({
          from: process.env.NOTIFICATION_FROM,
          to: [job.email],
          subject: 'An update from Encore',
          text: `${job.body}\n\nOpen Encore: ${url}\n\nYou can turn off email updates in your account settings.`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        await db.run('UPDATE notifications SET emailed=1 WHERE id=?', [job.id]);
      } else {
        const detail = (await response.text()).slice(0, 300);
        console.error(`Email notification ${job.id} failed (${response.status}): ${detail}`);
      }
    } catch (error) {
      console.error(`Email notification ${job.id} could not be delivered:`, error);
    }
  }
}
