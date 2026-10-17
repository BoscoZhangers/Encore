import { Link } from 'react-router-dom';

export function BrandLogo() {
  return (
    <Link to="/" className="logo" aria-label="Encore home">
      <span className="logo-crop">
        <img src="/brand/encore-reference.png" alt="" />
      </span>
      <span>
        Encore<span className="logo-period">.</span>
      </span>
    </Link>
  );
}
