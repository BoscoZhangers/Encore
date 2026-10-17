import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MarketplaceIntro } from '../components/marketplace/MarketplaceIntro';
import { SellerListingSection } from '../components/marketplace/SellerListingSection';
import { CoraActivity } from '../components/marketplace/CoraActivity';
import type { User } from '../types';

export function Overview({ user, aiConnected }: { user: User; aiConnected: boolean }) {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash === '#cora-guide')
      document.getElementById('cora-guide')?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <div className="page discover">
      <MarketplaceIntro user={user} />
      {user ? (
        <div className="overview-listings-layout">
          <SellerListingSection overview />
          <CoraActivity />
        </div>
      ) : (
        <section className="overview-signin">
          <h2>Your selling overview</h2>
          <p>Sign in to see your listings and their progress.</p>
          <Link className="button" to="/login?next=/">
            Sign in
          </Link>
          <Link className="text-button" to="/discover">
            Browse the marketplace
          </Link>
        </section>
      )}
    </div>
  );
}
