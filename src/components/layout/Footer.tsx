import { Leaf } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export function Footer({ variant = 'marketplace' }: { variant?: 'marketplace' | 'app' }) {
  if (variant === 'app') {
    return (
      <footer className="footer">
        <div className="footer-brand">
          <BrandLogo />
          <span>Good things deserve another chapter.</span>
        </div>
        <div className="footer-meta">
          <span>© 2026 Encore</span>
          <span>
            <Leaf size={14} /> Made for second chances
          </span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="market-footer">
      <div className="market-footer-brand">
        <img src="/brand/encore-mark.svg" alt="" />
        <strong>Encore</strong>
        <span>Good things deserve another chapter.</span>
      </div>
      <div className="market-footer-meta">
        <span>© 2026 Encore</span>
        <span>
          <Leaf size={13} /> Made for second chances
        </span>
      </div>
    </footer>
  );
}
