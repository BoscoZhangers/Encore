import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Bell, Leaf, LogOut } from 'lucide-react';
import type { User } from '../../types';
import { Footer } from './Footer';

export function MarketplaceShell({
  children,
  enabled,
  user,
  unread,
  logout,
}: {
  children: ReactNode;
  enabled: boolean;
  user: User;
  unread: number;
  logout: () => Promise<void>;
}) {
  const { pathname } = useLocation();
  if (!enabled) return <div className="app-page-content">{children}</div>;
  const page = pathname.startsWith('/items/')
    ? 'Listing details'
    : pathname === '/listings'
      ? 'Your listings'
      : pathname === '/discover'
        ? 'Discover'
        : pathname === '/messages' || pathname.startsWith('/messages/')
          ? 'Messages'
          : pathname === '/account'
            ? 'Account & privacy'
            : pathname === '/activity'
              ? 'Your updates'
              : pathname === '/insights'
                ? 'Insights'
                : pathname === '/inbox'
                  ? 'Cora requests'
                  : pathname === '/sell'
                    ? 'Sell an item'
                    : pathname.startsWith('/sell/')
                      ? 'Edit listing'
                      : pathname === '/selling'
                        ? 'My selling space'
                        : 'Overview';
  return (
    <div className="marketplace-shell">
      <a className="market-skip" href="#market-content">
        Skip to content
      </a>
      <div className="market-main">
        <header className="market-topbar">
          <div className="market-breadcrumb">
            <Link to="/">Encore</Link>
            <span>/</span>
            <strong>{page}</strong>
          </div>
          <div className="market-top-actions">
            <span className="market-top-note">
              <Leaf size={14} /> MADE FOR SECOND CHANCES
            </span>
            {user ? (
              <>
                <Link
                  className="market-notifications"
                  to="/activity"
                  aria-label={`Notifications, ${unread} unread`}
                >
                  <Bell size={19} />
                  {unread > 0 && <span>{unread}</span>}
                </Link>
                <Link className="market-avatar" to="/account" aria-label="Your account">
                  {user.name.slice(0, 1).toUpperCase()}
                </Link>
                <button onClick={logout} aria-label="Sign out" title="Sign out">
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Link className="market-login" to="/login">
                Sign in <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </header>
        <div id="market-content" className="market-content" tabIndex={-1}>
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}
