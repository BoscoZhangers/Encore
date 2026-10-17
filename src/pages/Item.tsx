import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Sparkles,
  SlidersHorizontal,
  LoaderCircle,
  Copy,
} from 'lucide-react';
import { cad, post } from '../api';
import { useData } from '../hooks/useData';
import { useListingView } from '../hooks/useListingView';
import { Spinner, ErrorBox, Picture } from '../components/ui';
import type { Tell } from '../components/feedback/Toast';

export function Item({
  user,
  tell,
  loading,
}: {
  user: { id: string } | null;
  tell: Tell;
  loading: boolean;
}) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromListings = searchParams.get('from') === 'listings';
  const { data, error } = useData(`/listings/${id}`, 4000);
  useListingView(
    id,
    !loading &&
      data?.listing?.id === id &&
      data?.listing?.status === 'published' &&
      data?.listing?.seller_id !== user?.id,
  );
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [actionError, setError] = useState('');
  async function start() {
    if (!user) return navigate(`/login?next=/items/${id}`);
    setBusy(true);
    try {
      const r = await post('/conversations', { listingId: id });
      navigate(`/messages/${r.conversation.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <div className="page">
        <ErrorBox error={error} />
      </div>
    );
  if (!data) return <Spinner />;
  const i = data.listing;
  return (
    <div className="page market-detail-page">
      <Link className="back" to={fromListings ? '/listings' : '/discover'}>
        <ArrowLeft size={16} /> {fromListings ? 'Your listings' : 'All finds'}
      </Link>
      <div className="detail-layout">
        <div>
          <Picture item={i} large />
          {i.photos.length > 1 && (
            <div className="gallery">
              {i.photos.slice(1).map((p: string) => (
                <img key={p} src={`/api/photos/${p}`} alt={`${i.title}, additional view`} />
              ))}
            </div>
          )}
        </div>
        <aside>
          <div className="eyebrow">
            <Sparkles size={14} /> {i.category}
          </div>
          <h1 className="detail-title">{i.title}</h1>
          <div className="detail-tags">
            <span>{i.condition}</span>
            <span>{i.available} available</span>
          </div>
          <div className="detail-price">
            {cad(i.price)} <small>CAD / item</small>
          </div>
          <p className="location">
            <MapPin size={16} />
            {i.area}
          </p>
          <section className="listing-description">
            <h2>About this item</h2>
            <p>{i.description}</p>
          </section>
          <hr />
          <div className="seller-info">
            <span className="avatar">{i.seller_name[0]}</span>
            <div>
              <strong>{i.seller_name}</strong>
              <p>Seller on Encore</p>
            </div>
          </div>
          <ErrorBox error={actionError} />
          {user?.id === i.seller_id ? (
            <Link className="button full" to={`/sell/${i.id}`}>
              Edit your listing <SlidersHorizontal size={17} />
            </Link>
          ) : (
            <button className="button full" disabled={busy || i.available <= 0} onClick={start}>
              {busy ? <LoaderCircle className="spin" size={18} /> : <MessageCircle size={18} />}{' '}
              {i.available > 0 ? 'Chat & make an offer' : 'Currently unavailable'}
            </button>
          )}
          <button
            className="button secondary full"
            onClick={() =>
              navigator.clipboard
                .writeText(location.href)
                .then(() => tell('Listing link copied.'))
                .catch(() => tell('Copy the link from your address bar.', 'warning'))
            }
          >
            <Copy size={16} /> Copy listing link
          </button>
          <div className="pickup-note">
            <MapPin size={17} />
            <div>
              <strong>Pickup preferences</strong>
              <p>{i.pickup}</p>
            </div>
          </div>
          <p className="hint">
            Reservations require seller confirmation. Arrange pickup before paying.
          </p>
          {user && user.id !== i.seller_id && (
            <button
              className="text-button"
              onClick={async () => {
                const reason = prompt('What is the concern with this listing?');
                if (reason)
                  try {
                    await post('/reports', { listingId: id, reason });
                    tell('Report recorded for review.');
                  } catch (e: any) {
                    setError(e.message);
                  }
              }}
            >
              Report listing
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
