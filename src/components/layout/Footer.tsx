import { Leaf } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export function Footer({ variant = 'marketplace' }: { variant?: 'marketplace' | 'app' }) {
  if (variant === 'app') {
    return (
      <footer className="footer">
        <BrandLogo />
        <span>Good things deserve another chapter.</span>
        <span>
          Made for second chances. <Leaf size={14} />
        </span>
      </footer>
    );
  }

  return (
    <footer className="market-footer">
      <span>
        <img src="/brand/encore-mark.svg" alt="" />
        Good things deserve another chapter.
      </span>
      <span>A little less new. A lot more possibility.</span>
    </footer>
  );
}
