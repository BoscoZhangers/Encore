import { MarketplaceIntro } from '../components/marketplace/MarketplaceIntro';
import { SellerListingSection } from '../components/marketplace/SellerListingSection';
import type { User } from '../types';

export function Listings({ user }: { user: User }) {
  return (
    <div className="page discover">
      <MarketplaceIntro user={user} listingsOnly />
      <SellerListingSection />
    </div>
  );
}
