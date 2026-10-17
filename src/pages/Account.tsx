import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import { api } from '../api';
import { useData } from '../hooks/useData';
import { AccountPhoto } from '../components/account/AccountPhoto';
import { ErrorBox } from '../components/ui';
import type { Tell } from '../components/feedback/Toast';
import {
  EmailNotificationPreference,
  type NotificationUser,
} from '../components/account/EmailNotificationPreference';

export function Account({
  user,
  setUser,
  tell,
}: {
  user: NotificationUser;
  setUser: (user: NotificationUser | null) => void;
  tell: Tell;
}) {
  const navigate = useNavigate();
  const blocks = useData('/blocks');
  const [error, setError] = useState('');
  return (
    <div className="page account-page">
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={14} /> Your space
          </div>
          <h1>Account & privacy</h1>
        </div>
      </div>
      <section className="panel account-panel">
        <h2>{user.name}</h2>
        <p className="muted">{user.email}</p>
        <AccountPhoto name={user.name} />
        <p>
          Your email is used to sign in. Sellers choose separately whether to share contact
          information on a listing.
        </p>
        <EmailNotificationPreference user={user} setUser={setUser} tell={tell} />
        <div className="account-wallet-link">
          <WalletCards size={20} />
          <div>
            <strong>Solana wallet</strong>
            <p>Connect Phantom and choose a default address for new listings.</p>
          </div>
          <Link to="/wallet">
            Manage <ArrowRight size={15} />
          </Link>
        </div>
        <h3>Blocked buyers</h3>
        {blocks.data?.blocks.length ? (
          blocks.data.blocks.map((b: any) => (
            <div className="block-row" key={b.buyer_id}>
              <span>{b.name}</span>
              <button
                className="button secondary small"
                onClick={async () => {
                  await api(`/blocks/${b.buyer_id}`, { method: 'DELETE' });
                  blocks.reload();
                  tell('Buyer unblocked.');
                }}
              >
                Unblock
              </button>
            </div>
          ))
        ) : (
          <p className="muted">No blocked buyers.</p>
        )}
        <hr />
        <h3>Delete your account</h3>
        <p>
          Remove your account, listings, photos, and conversations. Resolve active reservations
          first. This cannot be undone.
        </p>
        <ErrorBox error={error} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (!confirm('Permanently delete your account and its data?')) return;
            try {
              await api('/account', {
                method: 'DELETE',
                body: JSON.stringify({ password: f.get('password') }),
              });
              setUser(null);
              navigate('/');
              tell('Your account was deleted.');
            } catch (e: any) {
              setError(e.message);
            }
          }}
        >
          <label>
            Confirm your password
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
          <button className="button danger-button">
            <Trash2 size={16} /> Delete account
          </button>
        </form>
      </section>
    </div>
  );
}
