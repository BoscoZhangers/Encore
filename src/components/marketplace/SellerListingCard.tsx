import { Link } from 'react-router-dom';
import { ArrowUpRight, Eye, MapPin, Package } from 'lucide-react';
import { Picture } from '../ui';
import { cad } from '../../api';
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
  distance?: number | null;
  market_status?: 'active' | 'negotiating' | 'sold';
};

export function SellerListingCard({
  item,
  buyer = false,
}: {
  item: MarketplaceListing;
  buyer?: boolean;
}) {
  const status = item.market_status || 'active';
  const sold = status === 'sold';

  return (
    <article className={`figma-listing-card${sold ? ' sold' : ''}`}>
      <Link
        className="figma-listing-photo"
        to={`/items/${item.id}?from=listings`}
        aria-label={`View ${item.title}${sold ? ', sold' : ''}`}
      >
        <Picture item={item} />
        {sold && (
          <span className="figma-sold-cover" aria-hidden="true">
            <strong>Sold</strong>
            <small>Off to its next chapter</small>
          </span>
        )}
        <span className={`figma-listing-status ${status}`}>
          <i />
          {buyer
            ? item.condition
            : status === 'negotiating'
              ? 'Negotiating'
              : status === 'sold'
                ? 'Sold'
                : 'Active'}
        </span>
        <span className="figma-listing-arrow">
          <ArrowUpRight size={16} />
        </span>
      </Link>
      <p className="figma-listing-category">
        <span>{item.category}</span>
      </p>
      <Link to={`/items/${item.id}?from=listings`}>
        <h3>{item.title}</h3>
      </Link>
      <div className="figma-listing-price">
        {cad(item.price)}
        <span>CAD</span>
      </div>
      <div className="figma-listing-meta">
        <span>
          <Eye size={15} strokeWidth={1.7} aria-hidden="true" />
          {(item.views ?? 0).toLocaleString('en-CA')} {item.views === 1 ? 'view' : 'views'}
        </span>
      </div>
    </article>
  );
}
