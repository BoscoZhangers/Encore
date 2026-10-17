import { Infinity as InfinityIcon } from 'lucide-react';

export function CoraAvatar({ size = 25 }: { size?: number }) {
  return (
    <span className="cora-avatar" style={{ width: size, height: size }} aria-label="Cora">
      <InfinityIcon size={Math.round(size * 0.68)} strokeWidth={2.4} aria-hidden="true" />
    </span>
  );
}
