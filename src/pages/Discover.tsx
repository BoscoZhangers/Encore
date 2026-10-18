import { useEffect, useRef, useState } from 'react';
import { Store } from 'lucide-react';
import { useData } from '../hooks/useData';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import {
  BuyerListingCard,
  type MarketplaceListing,
} from '../components/marketplace/BuyerListingCard';
import {
  BuyerFilters,
  emptyBuyerFilters,
  type BuyerFilterValues,
} from '../components/marketplace/BuyerFilters';
import { RecommendationCarousel } from '../components/marketplace/RecommendationCarousel';
type Location = { lat: number; lng: number };
export function Discover() {
  const [draft, setDraft] = useState<BuyerFilterValues>(emptyBuyerFilters);
  const [applied, setApplied] = useState<BuyerFilterValues>(emptyBuyerFilters);
  const [coords, setCoords] = useState<Location | null>(null);
  const [locating, setLocating] = useState(false);
  const [filterError, setFilterError] = useState('');
  const locationRequest = useRef(0);
  useEffect(
    () => () => {
      ++locationRequest.current;
    },
    [],
  );
  const params = new URLSearchParams({ scope: 'others', sort: applied.sort });
  for (const [key, value] of Object.entries({
    q: applied.search,
    category: applied.category,
    condition: applied.condition,
    min: applied.min,
    max: applied.max,
    area: applied.area,
  }))
    if (value) params.set(key, value);
  if (coords) {
    params.set('lat', String(coords.lat));
    params.set('lng', String(coords.lng));
    if (applied.radius) params.set('radius', applied.radius);
  }
  const { data, error } = useData('/listings?' + params.toString());
  function apply() {
    if (draft.min && draft.max && Number(draft.min) > Number(draft.max)) {
      setFilterError('Minimum price must be no greater than maximum price.');
      return false;
    }
    setFilterError('');
    setApplied(draft);
    return true;
  }
  function reset() {
    ++locationRequest.current;
    setDraft(emptyBuyerFilters);
    setApplied(emptyBuyerFilters);
    setCoords(null);
    setFilterError('');
    setLocating(false);
  }
  function clearLocation() {
    ++locationRequest.current;
    setCoords(null);
    setLocating(false);
    setFilterError('');
    setDraft((v) => ({ ...v, radius: '', sort: v.sort === 'closest' ? 'newest' : v.sort }));
    setApplied((v) => ({ ...v, radius: '', sort: v.sort === 'closest' ? 'newest' : v.sort }));
  }
  function locate() {
    if (!navigator.geolocation) {
      setFilterError(
        'Location is unavailable in this browser. You can still search by neighborhood.',
      );
      return;
    }
    const request = ++locationRequest.current;
    setLocating(true);
    setFilterError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== locationRequest.current) return;
        setCoords({
          lat: Math.round(position.coords.latitude * 100) / 100,
          lng: Math.round(position.coords.longitude * 100) / 100,
        });
        setDraft((v) => ({ ...v, sort: 'closest' }));
        setApplied((v) => ({ ...v, sort: 'closest' }));
        setLocating(false);
      },
      () => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        setFilterError(
          'We couldn’t access your location. Allow location access or search by neighborhood instead.',
        );
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }
  const filtersPending = JSON.stringify(draft) !== JSON.stringify(applied);
  return (
    <div className="page buyer-discover">
      <div className="market-heading">
        <div>
          <p className="market-kicker">
            <Store size={14} /> THE ENCORE MARKETPLACE
          </p>
          <h1>
            Find your next favorite<span>.</span>
          </h1>
          <p>Good things from other sellers, ready for another chapter.</p>
        </div>
      </div>
      <BuyerFilters
        values={draft}
        onChange={setDraft}
        onApply={apply}
        onReset={reset}
        onLocate={locate}
        onClearLocation={clearLocation}
        locating={locating}
        hasLocation={!!coords}
        error={filterError}
      />
      <div className="buyer-results-heading">
        <h2>
          Explore the finds <span className="figma-count">{data?.listings.length ?? '…'}</span>
        </h2>
        <p role="status">
          {filtersPending
            ? 'Apply filters to update your results.'
            : applied.sort === 'closest'
              ? 'Closest first · approximate distances'
              : 'Available items from the community'}
        </p>
      </div>
      <ErrorBox error={error} />
      {!data && !error ? (
        <Spinner />
      ) : data?.listings.length ? (
        <div className="figma-listing-grid">
          {data.listings.map((item: MarketplaceListing) => (
            <BuyerListingCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        !error && (
          <Empty title="No finds match just yet">
            <p>
              Try a wider price range, another condition, or a nearby neighborhood. Your own
              listings stay in Overview.
            </p>
            <button className="button secondary" onClick={reset}>
              Reset filters
            </button>
          </Empty>
        )
      )}
      <RecommendationCarousel />
    </div>
  );
}
