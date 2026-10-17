import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { User } from '../types';
import { Empty, Spinner } from './ui';

export function Protected({
  children,
  user,
  loading,
}: {
  children: ReactNode;
  user: User;
  loading: boolean;
}) {
  const { pathname } = useLocation();
  if (loading) return <Spinner />;
  return user ? (
    <>{children}</>
  ) : (
    <div className="page">
      <Empty title="Your next chapter starts here">
        <p>Sign in to sell, make an offer, or talk to a seller’s assistant.</p>
        <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="button">
          Sign in <ArrowRight size={16} />
        </Link>
      </Empty>
    </div>
  );
}
