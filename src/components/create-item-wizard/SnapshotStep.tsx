import { X } from 'lucide-react';
import PhotoDraft, { type PhotoDraftSelection } from './PhotoDraft';
import type { ListingDraft, ListingField } from './types';

export function SnapshotStep({
  active,
  item,
  field,
  busy,
  photoBusy,
  onApply,
  onPhotoSelected,
  onBusyChange,
}: {
  active: boolean;
  item: ListingDraft;
  field: ListingField;
  busy: boolean;
  photoBusy: boolean;
  onApply: (selection: PhotoDraftSelection) => void;
  onPhotoSelected: (photoId: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  return (
    <div hidden={!active}>
      <PhotoDraft
        embedded
        active={active}
        onApply={onApply}
        onPhotoSelected={onPhotoSelected}
        onBusyChange={onBusyChange}
        hasDetails={!!(item.title || item.description)}
        photoCount={0}
      />
      {!!item.photos.length && (
        <div className="wizard-photos" aria-label="Selected listing photos">
          {item.photos.map((photo: string) => (
            <div className="uploaded-photo" key={photo}>
              <img src={`/api/photos/${photo}`} alt="Selected item photo" />
              <button
                type="button"
                aria-label="Remove selected photo"
                disabled={busy || photoBusy}
                onClick={() =>
                  field(
                    'photos',
                    item.photos.filter((candidate: string) => candidate !== photo),
                  )
                }
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
