import { Link } from 'react-router-dom';
import { ArrowUpRight, Eye, MapPin, Package } from 'lucide-react';
import { Picture } from '../ui';
import { cad } from '../../api';
import { SellerAvatar } from '../SellerAvatar';
export type MarketplaceListing = {
  id: string;
  title: string;
  category: string;
  condition: string;
  photos: string[];
  price: number;
  views: number;
  available: number;
  area: string;
  seller_name?: string;
  seller_avatar_url?: string | null;
  distance?: number | null;
  market_status?: 'active' | 'negotiating' | 'sold';
};

export function BuyerListingCard({ item }: { item: MarketplaceListing }) {
  const sellerName = item.seller_name || 'Seller';

  return (
    <article className="figma-listing-card">
      <Link
        className="figma-listing-photo"
        to={`/items/${item.id}`}
        aria-label={`View ${item.title}, ${item.condition}`}
      >
        <Picture item={item} />
        <span className="figma-listing-status buyer-condition">
          <i aria-hidden="true" />
          {item.condition}
        </span>
        <span className="figma-listing-arrow">
          <ArrowUpRight size={16} />
        </span>
      </Link>
      <p className="figma-listing-category">{item.category}</p>
      <Link to={`/items/${item.id}`}>
        <h3>{item.title}</h3>
      </Link>
      <div className="figma-listing-price">
        {cad(item.price)}
        <span>CAD</span>
      </div>
      <div className="buyer-listing-seller">
        <SellerAvatar name={sellerName} src={item.seller_avatar_url} />
        <span>
          <small>Listed by</small>
          <strong>{sellerName}</strong>
        </span>
      </div>
      <div className="figma-listing-meta">
        <span>
          <Eye size={15} strokeWidth={1.7} aria-hidden="true" />
          {(item.views ?? 0).toLocaleString('en-CA')} {item.views === 1 ? 'view' : 'views'}
        </span>
        <span>
          <MapPin size={13} />
          {item.area}
          {item.distance != null ? ` · ${item.distance.toFixed(1)} km` : ''}
        </span>
        <span>
          <Package size={13} />
          {item.available} available
        </span>
      </div>
    </article>
  );
}
