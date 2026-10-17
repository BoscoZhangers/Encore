import { useEffect } from 'react';
import { post } from '../api';

let fallbackVisitor: string | undefined;
function visitorId() {
  fallbackVisitor ??= crypto.randomUUID();
  try {
    const stored = window.localStorage.getItem('encore-viewer');
    if (stored && /^[0-9a-f-]{36}$/i.test(stored)) return stored;
    window.localStorage.setItem('encore-viewer', fallbackVisitor);
  } catch {
    // Browsing still works when storage is unavailable.
  }
  return fallbackVisitor;
}

export function useListingView(listingId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!listingId || !enabled) return;
    // The server deduplicates refreshes, concurrent tabs and React Strict Mode effects.
    // Analytics failure must never prevent someone opening a listing.
    void post(`/listings/${listingId}/views`, { visitorId: visitorId() }).catch(() => {});
  }, [listingId, enabled]);
}
