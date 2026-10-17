import { Link } from 'react-router-dom';
import { ArrowRight, Infinity, MessageCircle, Plus, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import type { User } from '../../types';
import { InsightsSummary } from '../insights/InsightsSummary';
import { HeroAtmosphere } from './HeroAtmosphere';

export function MarketplaceIntro({
  user,
  listingsOnly = false,
}: {
  user: User;
  listingsOnly?: boolean;
}) {
  return (
    <>
      <div className="market-heading">
        <div>
          <p className="market-kicker">
            <Sparkles size={14} /> A FRESH START FOR YOUR PRELOVED
          </p>
          <h1>
            {listingsOnly
              ? 'Your listings'
              : user
                ? `Welcome back, ${user.name.split(' ')[0]}`
                : 'Good things go around'}
            <span>.</span>
          </h1>
          <p>
            {listingsOnly
              ? 'Keep track of your listings and their next chapter.'
              : 'A little less clutter. A lot more possibility. Your next chapter starts here.'}
          </p>
        </div>
        <Link className="button" to={user ? '/sell' : '/login?next=/sell'}>
          <Plus size={17} /> Sell an item
        </Link>
      </div>
      {!listingsOnly && (
        <>
          <section className="market-banner">
            <HeroAtmosphere />
            <div className="market-banner-copy">
              <p className="market-banner-label">
                <Infinity size={15} /> MEET CORA, YOUR SELLING SIDEKICK
              </p>
              <h2>
                Good things deserve
                <br />
                another chapter.
              </h2>
              <p>Give your things a second life.</p>
              <a href="#cora-guide">
                A little help goes a long way <ArrowRight size={17} />
              </a>
            </div>
          </section>
          {user ? (
            <InsightsSummary compact />
          ) : (
            <section className="market-benefits" aria-label="How Encore helps">
              <article>
                <ShoppingBag size={20} />
                <div>
                  <strong>Pre-loved. Re-discovered.</strong>
                  <p>Find more value in secondhand.</p>
                </div>
              </article>
              <article>
                <MessageCircle size={20} />
                <div>
                  <strong>Less back-and-forth.</strong>
                  <p>Cora helps with the conversation.</p>
                </div>
              </article>
              <article>
                <ShieldCheck size={20} />
                <div>
                  <strong>Your terms, always.</strong>
                  <p>The seller confirms the reservation.</p>
                </div>
              </article>
            </section>
          )}
        </>
      )}
    </>
  );
}
