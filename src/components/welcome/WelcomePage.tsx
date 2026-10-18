import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Camera,
  Check,
  Infinity as InfinityIcon,
  Leaf,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { FeatureShowcase } from './FeatureShowcase';
import { WelcomeOrbit } from './WelcomeOrbit';

export function WelcomePage({ children }: { children: ReactNode }) {
  return (
    <div className="welcome-page">
      <a className="welcome-skip" href="#welcome-signin">
        Skip to sign in
      </a>
      <header className="welcome-header">
        <a className="welcome-brand" href="#welcome-top" aria-label="Encore home">
          <img src="/brand/encore-mark.svg" alt="" />
          encore
        </a>
        <nav aria-label="Welcome navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#meet-cora">Meet Cora</a>
          <a className="welcome-nav-signin" href="#welcome-signin">
            Sign in <ArrowRight size={16} />
          </a>
        </nav>
      </header>
      <main id="welcome-top">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-intro">
            <span className="welcome-eyebrow">
              <span className="welcome-dot" /> A SECONDHAND MARKETPLACE. A FRESH START.
            </span>
            <h1 id="welcome-title">
              Good things deserve
              <br />
              another <em>chapter.</em>
            </h1>
            <p>
              That chair. Those headphones. The things you’ve outgrown.
              <br className="welcome-desktop-break" /> Give them a second life—with a little help
              from Cora.
            </p>
            <a className="welcome-tour-link" href="#product-tour">
              Take a look inside <ArrowDown size={17} />
            </a>
            <WelcomeOrbit />
            <div className="welcome-hero-caption">
              <InfinityIcon size={21} />
              <span>
                Your things. Your terms. <strong>Cora handles the conversation.</strong>
              </span>
            </div>
          </div>
          <div className="welcome-auth-wrap">
            {children}
            <div className="welcome-auth-note">
              <ShieldCheck size={16} /> You set the boundaries. You approve the reservation.
            </div>
          </div>
        </section>
        <div className="welcome-principles" aria-label="Encore benefits">
          <span>
            <Camera /> Less work to list
          </span>
          <span>
            <MessageCircle /> Less back-and-forth
          </span>
          <span>
            <Leaf /> More second chances
          </span>
        </div>
        <FeatureShowcase />
        <section id="how-it-works" className="welcome-how">
          <div className="welcome-section-heading">
            <span className="welcome-eyebrow">FROM YOUR SHELF TO THEIR NEXT FAVORITE</span>
            <h2>A new chapter, in three steps.</h2>
            <p>You bring the item. We help with the rest.</p>
          </div>
          <div className="welcome-step-grid">
            {[
              {
                number: '01',
                icon: Camera,
                title: 'Snap it. Make it yours.',
                text: 'Start with a photo. Review the suggested details, set your price, and tell Cora what you know.',
              },
              {
                number: '02',
                icon: InfinityIcon,
                title: 'Let Cora take the first reply.',
                text: 'Cora answers questions and checks offers against your terms. Anything uncertain comes back to you.',
              },
              {
                number: '03',
                icon: Leaf,
                title: 'Say yes to its next chapter.',
                text: 'Approve the reservation, arrange the handoff, and mark the sale complete. One less thing. One new beginning.',
              },
            ].map(({ number, icon: Icon, title, text }) => (
              <article key={number}>
                <div>
                  <Icon size={25} />
                  <span>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="meet-cora" className="welcome-cora">
          <div className="welcome-cora-copy">
            <span className="welcome-eyebrow">
              <Sparkles size={14} /> MEET YOUR SELLING SIDEKICK
            </span>
            <h2>
              A little help.
              <br />
              <em>A lot more you-time.</em>
            </h2>
            <p>
              Cora is your AI selling assistant. Give her the facts and your boundaries, then get on
              with your day.
            </p>
            <ul>
              <li>
                <Check /> Answers from information you’ve confirmed
              </li>
              <li>
                <Check /> Checks offers against your private minimum
              </li>
              <li>
                <Check /> Asks you for help when she’s unsure
              </li>
              <li>
                <Check /> Leaves the final reservation approval to you
              </li>
            </ul>
            <a href="#welcome-signin">
              Make room for something new <ArrowRight size={18} />
            </a>
          </div>
          <div
            className="welcome-cora-conversation"
            aria-label="Illustrative conversation with Cora"
          >
            <div className="welcome-cora-chat-header">
              <span>
                <InfinityIcon size={27} />
              </span>
              <div>
                <strong>Cora</strong>
                <small>Your AI selling assistant</small>
              </div>
              <span className="welcome-demo-label">Example</span>
            </div>
            <div className="welcome-example-buyer">Does it come with the original case?</div>
            <div className="welcome-example-cora">
              Yes! The seller confirmed the original case is included.
              <span>
                <ShieldCheck size={12} /> Grounded in seller-confirmed details
              </span>
            </div>
            <div className="welcome-example-buyer">How long does the battery last now?</div>
            <div className="welcome-example-cora">
              Good question. I’ll check with the seller so you get an accurate answer.
            </div>
            <div className="welcome-handoff">
              <MessageCircle size={18} />
              <span>
                A little help from you<small>Cora sent this question to the seller.</small>
              </span>
              <ArrowRight size={16} />
            </div>
          </div>
        </section>
        <section className="welcome-closing">
          <Leaf size={28} />
          <h2>Your next chapter starts here.</h2>
          <p>Find something you love. Make space for something new.</p>
          <a className="button" href="#welcome-signin">
            Join Encore <ArrowRight size={17} />
          </a>
        </section>
      </main>
      <footer className="welcome-footer">
        <span>© 2026 Encore</span>
        <span>
          <Leaf size={14} /> Made for second chances.
        </span>
        <a href="#welcome-top">Back to top ↑</a>
      </footer>
    </div>
  );
}
