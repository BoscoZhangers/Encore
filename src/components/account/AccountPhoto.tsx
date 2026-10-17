import { useRef, useState } from 'react';
import { api } from '../../api';
import { useData } from '../../hooks/useData';
import { SellerAvatar } from '../SellerAvatar';
import { ErrorBox } from '../ui';

export function AccountPhoto({ name }: { name: string }) {
  const { data, error: loadError, reload } = useData('/account/profile');
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(file?: File) {
    if (
      file &&
      (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 8 * 1024 * 1024)
    ) {
      setError('Choose a JPG, PNG, or WebP photo under 8 MB.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let photoId = null;
      if (file) {
        const body = new FormData();
        body.append('photo', file);
        const result = await api('/photos', { method: 'POST', body });
        photoId = result.id;
      }
      await api('/account/profile', { method: 'PATCH', body: JSON.stringify({ photoId }) });
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="account-photo">
        <SellerAvatar name={name} src={data?.avatar_url} />
        <div>
          <strong>Profile photo</strong>
          <p className="hint">Shown publicly beside your name on your listings.</p>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Profile photo"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void save(file);
            }}
          />
          <div className="account-photo-controls">
            <button
              type="button"
              className="button secondary small"
              disabled={busy || !data}
              onClick={() => input.current?.click()}
            >
              {busy ? 'Saving…' : data?.avatar_url ? 'Change photo' : 'Add photo'}
            </button>
            {data?.avatar_url && (
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => void save()}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>
      <ErrorBox error={error || loadError} />
    </div>
  );
}
