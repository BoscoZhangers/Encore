import { useState } from 'react';
import { BellRing, Mail, ShieldAlert } from 'lucide-react';
import { api } from '../../api';
import { useData } from '../../hooks/useData';
import type { Tell } from '../feedback/Toast';

export type NotificationUser = {
  id: string;
  name: string;
  email: string;
  email_notifications?: boolean;
};

export function EmailNotificationPreference({
  user,
  setUser,
  tell,
  compact = false,
}: {
  user: NotificationUser;
  setUser: (user: NotificationUser | null) => void;
  tell: Tell;
  compact?: boolean;
}) {
  const delivery = useData('/account/email-status');
  const [saving, setSaving] = useState(false);
  const enabled = !!user.email_notifications;
  const available = delivery.data?.available !== false;

  async function setEnabled(next: boolean) {
    setSaving(true);
    try {
      await api('/account/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ email_notifications: next }),
      });
      setUser({ ...user, email_notifications: next });
      tell(
        next
          ? available
            ? `Email notifications will be sent to ${user.email}.`
            : 'Your preference was saved, but email delivery is not configured on this server yet.'
          : 'Email notifications turned off.',
        next && !available ? 'warning' : next ? 'success' : 'info',
      );
    } catch (error: any) {
      tell(error.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`email-notification-preference${compact ? ' compact' : ''}`}>
      <span className="email-notification-icon" aria-hidden="true">
        {available ? <BellRing size={19} /> : <ShieldAlert size={19} />}
      </span>
      <div className="email-notification-copy">
        <strong>Email new updates</strong>
        <span>
          Offers, reservations, sales, and questions where Cora needs your help will go to{' '}
          {user.email}.
        </span>
        {!delivery.data ? (
          <small>Checking email delivery…</small>
        ) : available ? (
          <small>
            <Mail size={12} /> Email delivery is ready.
          </small>
        ) : (
          <small className="delivery-warning">
            <ShieldAlert size={12} /> Delivery is not configured on this server. In-app updates
            still work.
          </small>
        )}
      </div>
      <button
        type="button"
        className={`preference-switch${enabled ? ' enabled' : ''}`}
        role="switch"
        aria-checked={enabled}
        aria-label="Email new updates"
        disabled={saving}
        onClick={() => void setEnabled(!enabled)}
      >
        <span />
      </button>
    </section>
  );
}
