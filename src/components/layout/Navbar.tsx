import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  CircleHelp,
  ChartNoAxesCombined,
  LayoutGrid,
  Leaf,
  MessageCircle,
  Package,
  Settings,
  ShoppingBag,
  Store,
  WalletCards,
} from 'lucide-react';
import type { Tell } from '../feedback/Toast';
import type { User } from '../../types';

export function Navbar({
  user,
  pathname,
  unreadMessages = 0,
  tell,
}: {
  user: User;
  pathname: string;
  unreadMessages?: number;
  tell: Tell;
}) {
  const { search } = useLocation();
  const sellerListing =
    pathname.startsWith('/items/') && new URLSearchParams(search).get('from') === 'listings';
  return (
    <aside className="market-sidebar">
      <Link to="/" className="market-brand" aria-label="Encore home">
        <img src="/brand/encore-mark.svg" alt="" />
        <span>encore</span>
      </Link>
      <p className="market-nav-label">YOUR SELLING SPACE</p>
      <nav aria-label="Marketplace navigation">
        <NavLink to="/" end title="Overview">
          <LayoutGrid size={19} />
          <span>Overview</span>
        </NavLink>
        <Link
          to="/listings"
          title="Your listings"
          className={pathname === '/listings' || sellerListing ? 'active' : undefined}
          aria-current={pathname === '/listings' || sellerListing ? 'page' : undefined}
        >
          <ShoppingBag size={19} />
          <span>Listings</span>
        </Link>
        <NavLink to="/selling" title="My selling space">
          <Package size={19} />
          <span>Selling space</span>
        </NavLink>
        <NavLink to="/insights" title="Insights">
          <ChartNoAxesCombined size={19} />
          <span>Insights</span>
        </NavLink>
        <NavLink to="/wallet" title="Solana wallet">
          <WalletCards size={19} />
          <span>Wallet</span>
        </NavLink>
        <NavLink
          to="/discover"
          title="Discover"
          className={pathname.startsWith('/items/') && !sellerListing ? 'active' : undefined}
        >
          <Store size={19} />
          <span>Discover</span>
        </NavLink>
        <NavLink
          to="/messages"
          title="Messages"
          aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages'}
        >
          <MessageCircle size={19} />
          <span>Messages</span>
          {unreadMessages > 0 && (
            <b className="market-message-count" aria-hidden="true">
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </b>
          )}
        </NavLink>
      </nav>
      <div className="market-sidebar-bottom">
        <div className="market-impact">
          <span>
            <Leaf size={22} />
          </span>
          <strong>Good things go around.</strong>
          <p>A new home for the things you’ve loved. A little more possibility for someone else.</p>
          <Link to={user ? '/sell' : '/login?next=/sell'}>
            Give it another chapter <ArrowRight size={15} />
          </Link>
        </div>
        <button
          className="market-help"
          type="button"
          title="Help & Support"
          onClick={() =>
            tell('Need a hand? Contact hello@encore.example for demo support.', 'info')
          }
        >
          <CircleHelp size={18} />
          <span>Help & Support</span>
        </button>
        <Link
          className="market-profile"
          to={user ? '/account' : '/login'}
          title={user ? 'Your account' : 'Sign in'}
        >
          <span className="market-avatar">{user ? user.name.slice(0, 1).toUpperCase() : 'E'}</span>
          <span>
            <strong>{user?.name || 'Welcome to Encore'}</strong>
            <small>{user ? 'Your account' : 'Sign in to get started'}</small>
          </span>
          <Settings size={16} />
        </Link>
      </div>
    </aside>
  );
}
