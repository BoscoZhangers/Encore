import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Plus } from 'lucide-react';
import { api, post } from './api';
import { Footer } from './components/layout/Footer';
import { Protected } from './components/Protected';
import { BrandLogo } from './components/layout/BrandLogo';
import { MarketplaceShell } from './components/layout/MarketplaceShell';
import { Empty } from './components/ui';
import { Toast, type Tell, type ToastNotice } from './components/feedback/Toast';
import { CoraShortcut } from './components/agent/CoraShortcut';
import { useUnreadMessages } from './hooks/useUnreadMessages';
import { Navbar } from './components/layout/Navbar';
import { Account } from './pages/Account';
import { Activity } from './pages/Activity';
import { Discover } from './pages/Discover';
import { AgentInbox } from './pages/agent-inbox/AgentInbox';
import { Insights } from './pages/Insights';
import { Item } from './pages/Item';
import { Listings } from './pages/Listings';
import { Login } from './pages/Login';
import { Messages } from './pages/Messages';
import { Overview } from './pages/Overview';
import { Sell } from './pages/Sell';
import { SellingSpace } from './pages/SellingSpace';
import { Wallet } from './pages/Wallet';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const { pathname } = useLocation();
  const unreadMessages = useUnreadMessages(user?.id);
  const marketplace =
    pathname === '/' ||
    pathname === '/discover' ||
    pathname === '/listings' ||
    pathname === '/selling' ||
    pathname === '/account' ||
    pathname === '/activity' ||
    pathname === '/insights' ||
    pathname === '/wallet' ||
    pathname === '/inbox' ||
    pathname === '/sell' ||
    pathname.startsWith('/sell/') ||
    pathname === '/messages' ||
    pathname.startsWith('/messages/') ||
    pathname.startsWith('/items/');
  const timer = useRef<any>(null);
  const navigate = useNavigate();
  const tell: Tell = useCallback((message, kind = 'success') => {
    setToast({ id: Date.now(), message, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 6500 : 4500);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() =>
        tell('Could not connect to Encore. Please refresh once the server is running.', 'error'),
      )
      .finally(() => setLoading(false));
    api('/health')
      .then(setHealth)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    const read = () =>
      api('/notifications')
        .then((d) => setUnread(d.notifications.filter((n: any) => !n.seen).length))
        .catch(() => {});
    void read();
    const t = setInterval(read, 7000);
    return () => clearInterval(t);
  }, [user]);

  async function logout() {
    await post('/auth/logout');
    setUser(null);
    navigate('/');
  }

  const protect = (content: ReactNode) => (
    <Protected user={user} loading={loading}>
      {content}
    </Protected>
  );

  return (
    <>
      <Navbar user={user} pathname={pathname} unreadMessages={unreadMessages} tell={tell} />
      <MarketplaceShell enabled={marketplace} user={user} unread={unread} logout={logout}>
        {!marketplace && (
          <header className="header">
            <div className="header-inner">
              <BrandLogo />
              <nav aria-label="Main navigation">
                <NavLink to="/discover">Discover</NavLink>
                <NavLink to="/selling">My selling space</NavLink>
                <NavLink to="/messages">Messages</NavLink>
              </nav>
              <div className="header-actions">
                {user ? (
                  <>
                    <Link
                      className="bell"
                      to="/activity"
                      aria-label={`Notifications, ${unread} unread`}
                    >
                      <Bell size={19} />
                      {unread > 0 && <span>{unread}</span>}
                    </Link>
                    <Link className="avatar" to="/account" title="Account">
                      {user.name.slice(0, 1).toUpperCase()}
                    </Link>
                    <button className="icon-btn logout" onClick={logout} aria-label="Sign out">
                      <LogOut size={17} />
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="sign-in">
                    Sign in
                  </Link>
                )}
                <Link to={user ? '/sell' : '/login?next=/sell'} className="button header-sell">
                  <Plus size={16} /> Sell an item
                </Link>
              </div>
            </div>
          </header>
        )}
        <main>
          <Routes>
            <Route
              path="/"
              element={<Overview user={user} aiConnected={health?.agent === 'gemini'} />}
            />
            <Route path="/listings" element={<Listings user={user} />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/insights" element={protect(<Insights />)} />
            <Route path="/wallet" element={protect(<Wallet tell={tell} />)} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/items/:id" element={<Item user={user} tell={tell} loading={loading} />} />
            <Route path="/selling" element={protect(<SellingSpace user={user} />)} />
            <Route path="/sell/:id?" element={protect(<Sell tell={tell} />)} />
            <Route path="/messages/:id?" element={protect(<Messages user={user} tell={tell} />)} />
            <Route path="/inbox" element={protect(<AgentInbox tell={tell} />)} />
            <Route path="/activity" element={protect(<Activity />)} />
            <Route
              path="/account"
              element={protect(<Account user={user} setUser={setUser} tell={tell} />)}
            />
            <Route
              path="*"
              element={
                <Empty title="This page has moved">
                  <Link to="/">Back to Encore</Link>
                </Empty>
              }
            />
          </Routes>
        </main>
        {!marketplace && <Footer variant="app" />}
      </MarketplaceShell>
      {user && <CoraShortcut />}
      {toast && <Toast key={toast.id} notice={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
