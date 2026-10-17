import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Leaf,
  MessageCircle,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { cad } from '../api';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { SellerInventoryCard } from '../components/selling/SellerInventoryCard';
import { useData } from '../hooks/useData';
import type { User } from '../types';

export function SellingSpace({ user }: { user: NonNullable<User> }) {
  const { data, error } = useData('/seller/listings');
  const metrics = useData('/seller/metrics');
  const requests = useData('/seller/requests', 8000);
  const items = data?.listings || [];
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">
            <Package size={14} /> Less effort. More second chances.
          </p>
          <h1>Your selling space</h1>
          <p className="muted">
            Hi {user.name.split(' ')[0]}. Your things have a next chapter waiting.
          </p>
        </div>
        <Link to="/sell" className="button">
          <Plus size={17} /> List an item
        </Link>
      </div>
      <div className="stats">
        <div>
          <span>Available to find a new home</span>
          <strong>{items.reduce((sum: number, i: any) => sum + i.available, 0)}</strong>
          <Package size={23} />
        </div>
        <Link to="/inbox">
          <span>Need your input</span>
          <strong>
            {requests.data?.requests.filter((r: any) => r.status === 'pending').length || 0}
          </strong>
          <MessageCircle size={23} />
        </Link>
        <div>
          <span>Seller-confirmed proceeds</span>
          <strong>{cad(metrics.data?.proceeds || 0)}</strong>
          <Leaf size={23} />
        </div>
      </div>
      <div className="workspace-columns">
        <section>
          <div className="section-title">
            <h2>Your items</h2>
            <span className="muted">Available · Reserved · Sold</span>
          </div>
          <ErrorBox error={error} />
          {!data ? (
            <Spinner />
          ) : items.length ? (
            <div className="listing-grid seller-grid">
              {items.map((i: any) => (
                <SellerInventoryCard key={i.id} item={i} />
              ))}
            </div>
          ) : (
            <Empty title="Make room for your first listing">
              <p>Add something you no longer use. Your agent will help with the conversation.</p>
              <Link className="button" to="/sell">
                Create a listing <Plus size={16} />
              </Link>
            </Empty>
          )}
        </section>
        <aside>
          <div className="panel agent-card">
            <span className="agent-dot">
              <Sparkles size={23} />
            </span>
            <h3>
              A little help.
              <br />
              On your terms.
            </h3>
            <p>Your agent follows your lead.</p>
            <ul>
              <li>
                <Check size={16} /> Uses facts you confirm
              </li>
              <li>
                <Check size={16} /> Respects your price boundaries
              </li>
              <li>
                <Check size={16} /> Asks you when it’s unsure
              </li>
            </ul>
            <Link className="button secondary full" to="/inbox">
              Open seller inbox <ArrowRight size={15} />
            </Link>
          </div>
          <div className="mini-note">
            <ShieldCheck size={18} />
            <p>You approve every reservation. Only completed sales count toward your proceeds.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
