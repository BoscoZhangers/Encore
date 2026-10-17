import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Search, MapPin, SlidersHorizontal } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { Spinner, ErrorBox, Empty } from '../ui';
import { BuyerListingCard } from './BuyerListingCard';
const categories = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports', 'Other'];
export function ListingsSection() {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [stage, setStage] = useState('all'),
    [filters, setFilters] = useState(false),
    [area, setArea] = useState(''),
    [min, setMin] = useState(''),
    [max, setMax] = useState(''),
    [radius, setRadius] = useState('25'),
    [coords, setCoords] = useState<any>(null),
    [geoError, setGeoError] = useState(''),
    [query, setQuery] = useState('');
  const params = new URLSearchParams({
    scope: 'mine',
    q: query,
    stage,
    category,
    area,
    ...(min ? { min } : {}),
    ...(max ? { max } : {}),
    ...(coords ? { lat: String(coords.lat), lng: String(coords.lng), radius } : {}),
  });
  const { data, error } = useData('/listings?' + params.toString());
  const locate = () => {
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setCoords({
          lat: Math.round(p.coords.latitude * 100) / 100,
          lng: Math.round(p.coords.longitude * 100) / 100,
        }),
      () => setGeoError('Location was unavailable. Search by neighborhood instead.'),
      { timeout: 10000 },
    );
  };
  return (
    <section className="discovery" id="discover">
      <div className="figma-listing-heading">
        <div>
          <h2>
            Your listings <span className="figma-count">{data?.listings.length ?? '…'}</span>
          </h2>
          <p>Good things, ready for their next home.</p>
        </div>
        <Link
          to="/listings"
          onClick={() => {
            setSearch('');
            setQuery('');
            setStage('all');
            setCategory('');
            setArea('');
            setMin('');
            setMax('');
            setCoords(null);
          }}
        >
          View all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="figma-listing-toolbar">
        <div className="figma-listing-tabs" aria-label="Listing status">
          {(['all', 'active', 'negotiating', 'sold'] as const).map((value) => (
            <button
              key={value}
              aria-pressed={stage === value}
              className={stage === value ? 'active' : ''}
              onClick={() => setStage(value)}
            >
              {value === 'all'
                ? 'All listings'
                : value === 'active'
                  ? 'Active'
                  : value === 'negotiating'
                    ? 'Negotiating'
                    : 'Sold'}
            </button>
          ))}
        </div>
        <div className="figma-listing-tools">
          <form
            className="figma-listing-search"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search);
            }}
          >
            <button type="submit" aria-label="Search listings">
              <Search size={16} />
            </button>
            <input
              aria-label="Search items"
              placeholder="Search listings"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setQuery(e.target.value);
              }}
              maxLength={100}
            />
          </form>
          <button
            className="figma-filter-toggle filter-toggle"
            aria-label="Filter listings"
            aria-expanded={filters}
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={15} />
          </button>
        </div>
      </div>
      {filters && (
        <div className="filter-panel">
          <label>
            Category
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Neighborhood
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Scarborough"
            />
          </label>
          <label>
            Min price · CAD
            <input type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} />
          </label>
          <label>
            Max price · CAD
            <input type="number" min="0" value={max} onChange={(e) => setMax(e.target.value)} />
          </label>
          <label>
            Within
            <select value={radius} onChange={(e) => setRadius(e.target.value)}>
              {[5, 10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} km
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" onClick={coords ? () => setCoords(null) : locate}>
            <MapPin size={16} />
            {coords ? 'Clear location' : 'Use my area'}
          </button>
          {geoError && <p className="error">{geoError}</p>}
        </div>
      )}
      <ErrorBox error={error} />
      {!data && !error ? (
        <Spinner />
      ) : data?.listings.length ? (
        <div className="figma-listing-grid">
          {data.listings.map((i: any) => (
            <BuyerListingCard key={i.id} item={i} />
          ))}
        </div>
      ) : (
        <Empty title="A little room for something good">
          <p>No items match yet. Try another search, or be the first to list something.</p>
          <Link className="button" to="/sell">
            List an item <Plus size={16} />
          </Link>
        </Empty>
      )}
    </section>
  );
}
