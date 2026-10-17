import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell } from 'lucide-react';
import { post } from '../api';
import { useData } from '../hooks/useData';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import {
  EmailNotificationPreference,
  type NotificationUser,
} from '../components/account/EmailNotificationPreference';
import type { Tell } from '../components/feedback/Toast';

export function Activity({
  user,
  setUser,
  tell,
}: {
  user: NotificationUser;
  setUser: (user: NotificationUser | null) => void;
  tell: Tell;
}) {
  const { data, error, reload } = useData('/notifications', 6000);
  useEffect(() => {
    post('/notifications/read')
      .then(reload)
      .catch(() => {});
  }, []);
  return (
    <div className="page updates-page">
      <div className="updates-content">
        <div className="page-title">
          <div>
            <div className="eyebrow">
              <Bell size={14} /> In the loop
            </div>
            <h1>Your updates</h1>
          </div>
        </div>
        <EmailNotificationPreference user={user} setUser={setUser} tell={tell} compact />
        <ErrorBox error={error} />
        {!data ? (
          <Spinner />
        ) : data.notifications.length ? (
          <div className="panel notification-list">
            {data.notifications.map((n: any) => (
              <Link to={n.href} key={n.id}>
                <span className="notification-icon">
                  <Bell size={18} />
                </span>
                <div>
                  <p>{n.body}</p>
                  <small>{new Date(Number(n.created_at)).toLocaleString()}</small>
                </div>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="A quiet moment">
            <p>Seller replies and reservation updates will appear here.</p>
          </Empty>
        )}
      </div>
    </div>
  );
}
