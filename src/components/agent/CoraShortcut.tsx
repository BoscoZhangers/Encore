import { Infinity as InfinityIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function CoraShortcut() {
  const { pathname } = useLocation();
  return (
    <Link
      className={`cora-shortcut${pathname === '/inbox' ? ' active' : ''}`}
      to="/inbox"
      aria-label="Open Cora requests"
      title="Cora needs a hand"
    >
      <InfinityIcon size={37} strokeWidth={2.25} />
    </Link>
  );
}
