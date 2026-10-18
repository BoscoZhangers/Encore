import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../../hooks/useData';
import { BuyerListingCard, type MarketplaceListing } from './BuyerListingCard';

type Interest = {
  category: string;
  views: number;
  chats: number;
  purchases: number;
  score: number;
};

const PAGE_SIZE = 4;

function reason(interests: Interest[]) {
  if (!interests.length) return 'Popular secondhand finds from the Encore community.';
  const categories = interests.slice(0, 2).map((interest) => interest.category);
  return `Based on your interest in ${categories.join(' and ')}.`;
}

export function RecommendationCarousel({ overview = false }: { overview?: boolean }) {
  const { data, error } = useData('/recommendations?limit=16');
  const [page, setPage] = useState(0);
  const listings: MarketplaceListing[] = data?.listings ?? [];
  const pageCount = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = listings.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => setPage(0), [data?.listings]);

  if (error || (data && !listings.length)) return null;

  return (
    <section className={`recommendation-carousel${overview ? ' overview-recommendations' : ''}`}>
      <div className="recommendation-heading">
        <div>
          <p className="market-kicker">
            <Sparkles size={14} /> PICKED FOR YOUR NEXT CHAPTER
          </p>
          <h2>Recommended for you</h2>
          <p>
            {data ? reason(data.interests) : 'Learning what deserves a place in your next chapter.'}
          </p>
        </div>
        <div className="recommendation-actions">
          {overview && (
            <Link to="/discover">
              Explore all <ArrowRight size={15} />
            </Link>
          )}
          {pageCount > 1 && (
            <div className="carousel-controls" aria-label="Recommendation pages">
              <button
                type="button"
                aria-label="Previous recommendations"
                disabled={currentPage === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                <ArrowLeft size={16} />
              </button>
              <span aria-live="polite">
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                aria-label="Next recommendations"
                disabled={currentPage === pageCount - 1}
                onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      {!data ? (
        <div className="recommendation-loading" aria-label="Loading recommendations">
          {Array.from({ length: PAGE_SIZE }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      ) : (
        <div className="recommendation-page">
          {visible.map((item) => (
            <BuyerListingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
