import { useState } from 'react';

export function SellerAvatar({ name, src }: { name: string; src?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'S';
  return (
    <span className="seller-avatar">
      {src && src !== failed ? (
        <img
          src={src}
          alt={`${name}'s profile photo`}
          loading="lazy"
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-label={`${name}'s initials`}>{initials}</span>
      )}
    </span>
  );
}
