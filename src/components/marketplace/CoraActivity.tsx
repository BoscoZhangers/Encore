import { ArrowRight, Bell, CircleHelp, PackageCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../../hooks/useData';
import { ErrorBox, Spinner } from '../ui';

type Notification = {
  id: string;
  body: string;
  href: string;
  created_at: number;
};

type NotificationKind = 'offer' | 'sale' | 'question' | 'listing' | 'general';

function notificationKind(body: string): NotificationKind {
  const normalized = body.toLowerCase();
  if (normalized.includes('offer')) return 'offer';
  if (normalized.includes('sale completed') || normalized.includes('marked this sale completed'))
    return 'sale';
  if (normalized.includes('question')) return 'question';
  if (normalized.includes('listing')) return 'listing';
  return 'general';
}

function notificationTitle(kind: NotificationKind) {
  if (kind === 'offer') return 'A good offer just landed';
  if (kind === 'sale') return 'Off to a new adventure';
  if (kind === 'question') return 'Cora needs your help';
  if (kind === 'listing') return 'A new chapter is ready';
  return 'The latest from Cora';
}

function notificationAction(kind: NotificationKind) {
  if (kind === 'offer') return 'Review offer';
  if (kind === 'question') return 'Answer question';
  if (kind === 'listing') return 'View listing';
  return 'View update';
}

function NotificationIcon({ kind }: { kind: NotificationKind }) {
  if (kind === 'offer') return <Sparkles size={20} />;
  if (kind === 'sale') return <ShoppingBag size={20} />;
  if (kind === 'question') return <CircleHelp size={20} />;
  if (kind === 'listing') return <PackageCheck size={20} />;
  return <Bell size={20} />;
}

function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CoraActivity() {
  const { data, error, reload } = useData('/notifications', 6000);
  const notifications: Notification[] = (data?.notifications ?? []).slice(0, 3);

  return (
    <aside className="cora-activity" aria-labelledby="cora-activity-title">
      <div className="cora-activity-heading">
        <h2 id="cora-activity-title">Your updates</h2>
      </div>
      {error ? (
        <div className="cora-activity-empty">
          <ErrorBox error={error} />
          <button type="button" onClick={() => void reload()}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <Spinner />
      ) : notifications.length ? (
        <ol className="cora-activity-list">
          {notifications.map((notification) => {
            const kind = notificationKind(notification.body);
            return (
              <li key={notification.id}>
                <span className={`cora-activity-icon ${kind === 'offer' ? '' : 'neutral'}`}>
                  <NotificationIcon kind={kind} />
                </span>
                <div>
                  <time
                    dateTime={new Date(Number(notification.created_at)).toISOString()}
                    title={new Date(Number(notification.created_at)).toLocaleString()}
                  >
                    {relativeTime(Number(notification.created_at))}
                  </time>
                  <h3>{notificationTitle(kind)}</h3>
                  <p>{notification.body}</p>
                  <Link className="cora-activity-link" to={notification.href}>
                    {notificationAction(kind)} <ArrowRight size={16} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="cora-activity-empty">
          <span className="cora-quiet-icon" aria-hidden="true">
            <span>Z</span>
            <span>z</span>
            <span>z</span>
          </span>
          <h3>A quiet moment for Cora</h3>
          <p>Offers, buyer conversations, and questions that need your help will appear here.</p>
        </div>
      )}
      <Link className="cora-activity-footer" to="/activity">
        Get caught up <ArrowRight size={17} />
      </Link>
    </aside>
  );
}
