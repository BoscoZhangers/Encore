import { MapPin } from 'lucide-react';
import type { WizardStepProps } from './types';
import type { Tell } from '../feedback/Toast';

export function HandoffStep({ item, field, setItem, tell }: WizardStepProps & { tell: Tell }) {
  return (
    <>
      <label>
        Neighborhood / area
        <input
          value={item.area}
          onChange={(event) => field('area', event.target.value)}
          minLength={2}
          maxLength={100}
          required
          placeholder="e.g. Scarborough · UTSC"
        />
      </label>
      <label>
        Pickup preferences
        <input
          value={item.pickup}
          onChange={(event) => field('pickup', event.target.value)}
          maxLength={400}
          minLength={3}
          required
          placeholder="e.g. Campus library, weekday evenings"
        />
      </label>
      <button
        type="button"
        className="text-button"
        onClick={() =>
          navigator.geolocation.getCurrentPosition(
            (position) =>
              setItem((current) => ({
                ...current,
                latitude: Math.round(position.coords.latitude * 100) / 100,
                longitude: Math.round(position.coords.longitude * 100) / 100,
              })),
            () => tell('Location unavailable. You can still list by neighborhood.', 'warning'),
          )
        }
      >
        <MapPin size={15} />
        {item.latitude === null
          ? 'Add approximate location for nearby search'
          : 'Update approximate location'}
      </button>
      {item.latitude !== null && (
        <p className="hint">
          Approximate map location added.{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => setItem((current) => ({ ...current, latitude: null, longitude: null }))}
          >
            Remove
          </button>
        </p>
      )}
      <label>
        Contact for escalations (optional)
        <input
          value={item.contact}
          onChange={(event) => field('contact', event.target.value)}
          maxLength={200}
          placeholder="Email or other contact you choose to share"
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={item.share_contact}
          onChange={(event) => field('share_contact', event.target.checked)}
        />{' '}
        Allow the agent to share this contact when it asks me for help
      </label>
      <p className="hint">Your account email is never automatically shared with buyers.</p>
    </>
  );
}
