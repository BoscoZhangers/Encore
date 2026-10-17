import { Link } from 'react-router-dom';
import { MapPin, SlidersHorizontal, Sparkles } from 'lucide-react';
import { cad } from '../../api';
import { Picture } from '../ui';

export function SellerInventoryCard({ item }: { item: any }) {
  return (
    <article className="item-card">
      <Link to={`/items/${item.id}?from=listings`} className="picture-link">
        <Picture item={item} />
      </Link>
      <div className="item-card-body">
        <div className="category-line">
          {item.category}
          <span>
            <Sparkles size={11} /> Agent assisted
          </span>
        </div>
        <Link to={`/items/${item.id}?from=listings`}>
          <h3>{item.title}</h3>
        </Link>
        <p className="location">
          <MapPin size={12} />
          {item.area}
        </p>
        <div className="card-bottom">
          <strong>
            {cad(item.price)}
            <small> CAD</small>
          </strong>
          <Link className="icon-btn" to={`/sell/${item.id}`} aria-label={`Edit ${item.title}`}>
            <SlidersHorizontal size={17} />
          </Link>
        </div>
        <div className="inventory-line">
          <span className={`status ${item.status}`}>{item.status}</span>
          <span>
            {item.available} available · {item.reserved} reserved · {item.sold} sold
          </span>
        </div>
      </div>
    </article>
  );
}
