import type { ReactNode } from 'react';
import { LoaderCircle, Package, Headphones, Armchair, Shirt, BookOpen } from 'lucide-react';
export function Spinner() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={24} />
      <span>One moment…</span>
    </div>
  );
}

export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Package size={28} />
      </span>
      <h2>{title}</h2>
      <div className="muted">{children}</div>
    </div>
  );
}

export function Picture({ item, large = false }: { item: any; large?: boolean }) {
  const Icon =
    item.category === 'Electronics'
      ? Headphones
      : item.category === 'Furniture'
        ? Armchair
        : item.category === 'Clothing'
          ? Shirt
          : item.category === 'Books'
            ? BookOpen
            : Package;
  return (
    <div
      className={`item-picture ${large ? 'large' : ''} category-${item.category?.toLowerCase()}`}
    >
      {item.photos?.[0] ? (
        <img src={`/api/photos/${item.photos[0]}`} alt={item.title} />
      ) : (
        <>
          <div className="picture-orbit" />
          <Icon className="product-icon" size={large ? 125 : 76} strokeWidth={0.9} />
          <span className="no-photo">Photo coming soon</span>
        </>
      )}
      {item.condition && <span className="condition-badge">{item.condition}</span>}
    </div>
  );
}
