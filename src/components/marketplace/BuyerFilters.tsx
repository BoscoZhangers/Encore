import { useState } from 'react';
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
export type BuyerFilterValues = {
  search: string;
  category: string;
  condition: string;
  min: string;
  max: string;
  area: string;
  radius: string;
  sort: string;
};
export const emptyBuyerFilters: BuyerFilterValues = {
  search: '',
  category: '',
  condition: '',
  min: '',
  max: '',
  area: '',
  radius: '',
  sort: 'newest',
};
export function BuyerFilters({
  values,
  onChange,
  onApply,
  onReset,
  onLocate,
  onClearLocation,
  locating,
  hasLocation,
  error,
}: {
  values: BuyerFilterValues;
  onChange: (value: BuyerFilterValues) => void;
  onApply: () => boolean | void;
  onReset: () => void;
  onLocate: () => void;
  onClearLocation: () => void;
  locating: boolean;
  hasLocation: boolean;
  error: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const field = (key: keyof BuyerFilterValues, value: string) =>
    onChange({ ...values, [key]: value });
  const activeFilterCount = [
    values.category,
    values.condition,
    values.min,
    values.max,
    values.area,
    values.radius,
    values.sort === 'newest' ? '' : values.sort,
    hasLocation ? 'location' : '',
  ].filter(Boolean).length;

  function apply() {
    const applied = onApply();
    if (applied !== false) setExpanded(false);
  }

  return (
    <form
      className={`buyer-filters${expanded ? ' filters-open' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div className="buyer-search-row">
        <div className="buyer-search">
          <Search size={19} />
          <input
            aria-label="Search marketplace"
            placeholder="What are you looking for?"
            value={values.search}
            maxLength={100}
            onChange={(e) => field('search', e.target.value)}
          />
          <button
            type="button"
            className={`buyer-filter-toggle${activeFilterCount ? ' has-filters' : ''}`}
            aria-label={`${expanded ? 'Hide' : 'Show'} filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
            aria-expanded={expanded}
            aria-controls="buyer-filter-panel"
            onClick={() => setExpanded((open) => !open)}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
        </div>
        <button type="submit" className="button">
          <Search size={16} />
          Search
        </button>
      </div>
      {expanded && (
        <div className="buyer-filter-panel" id="buyer-filter-panel">
          <div className="buyer-filter-fields">
            <label>
              Category
              <select value={values.category} onChange={(e) => field('category', e.target.value)}>
                <option value="">All categories</option>
                {['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports', 'Other'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Condition
              <select value={values.condition} onChange={(e) => field('condition', e.target.value)}>
                <option value="">Any condition</option>
                <option value="New">New</option>
                <option value="Like new">Like new</option>
                <option value="Good">Good · used</option>
                <option value="Fair">Fair · well-used</option>
                <option value="For parts">For parts / repair</option>
              </select>
            </label>
            <fieldset className="buyer-price-range">
              <legend>Price range · CAD</legend>
              <div>
                <input
                  aria-label="Minimum price"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  placeholder="Min"
                  value={values.min}
                  onChange={(e) => field('min', e.target.value)}
                />
                <span>–</span>
                <input
                  aria-label="Maximum price"
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  placeholder="Max"
                  value={values.max}
                  onChange={(e) => field('max', e.target.value)}
                />
              </div>
            </fieldset>
            <label>
              Neighborhood
              <input
                value={values.area}
                maxLength={100}
                placeholder="e.g. Scarborough"
                onChange={(e) => field('area', e.target.value)}
              />
            </label>
            <label>
              Distance
              <select
                value={values.radius}
                onChange={(e) => field('radius', e.target.value)}
                disabled={!hasLocation}
              >
                <option value="">Any distance</option>
                {[5, 10, 25, 50, 100].map((km) => (
                  <option key={km} value={km}>
                    Within {km} km
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort by
              <select value={values.sort} onChange={(e) => field('sort', e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="closest" disabled={!hasLocation}>
                  Closest first{!hasLocation ? ' · set location' : ''}
                </option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>
          <div className="buyer-filter-actions">
            <div className="buyer-location-actions">
              <button className="text-button" type="button" onClick={onLocate} disabled={locating}>
                <MapPin size={15} />
                {locating
                  ? 'Finding your area…'
                  : hasLocation
                    ? 'Update my location'
                    : 'Use my location'}
              </button>
              {hasLocation && (
                <button type="button" className="text-button" onClick={onClearLocation}>
                  <X size={14} />
                  Clear location
                </button>
              )}
              <span>
                {hasLocation
                  ? 'Distances use approximate locations.'
                  : 'Set your location to sort nearby finds.'}
              </span>
            </div>
            <div>
              <button type="button" className="text-button" onClick={onReset}>
                Reset
              </button>
              <button type="submit" className="button secondary">
                <SlidersHorizontal size={15} />
                Apply filters
              </button>
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
