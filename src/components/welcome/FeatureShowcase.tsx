import { useState } from 'react';
import { Camera, LayoutGrid, MessageCircle, ArrowUpRight } from 'lucide-react';

const features = [
  {
    id: 'overview',
    icon: LayoutGrid,
    label: 'Your selling space',
    title: 'A little less clutter. A lot more clarity.',
    text: 'Your listings, updates from Cora, and selling progress—all together in one calm workspace.',
    image: 'overview',
    alt: 'Encore overview with listings, monthly insights, and recent updates from Cora',
  },
  {
    id: 'create',
    icon: Camera,
    label: 'Photo to listing',
    title: 'Start with a snapshot.',
    text: 'Turn a photo into a starting point. Review the details, add your knowledge, and set the terms before publishing.',
    image: 'create',
    alt: 'Encore item creation wizard with the photo capture and upload controls',
  },
  {
    id: 'conversation',
    icon: MessageCircle,
    label: 'Conversations with Cora',
    title: 'Keep your day. Skip the back-and-forth.',
    text: 'Cora answers buyers, brings offers to you, and asks for clarification when a detail needs your input.',
    image: 'conversation',
    alt: 'Encore messages showing Cora answering a buyer and sending an offer for seller approval',
  },
];
export function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const feature = features[active];
  return (
    <section id="product-tour" className="welcome-showcase">
      <div className="welcome-section-heading">
        <span className="welcome-eyebrow">LESS EFFORT. MORE SECOND CHANCES.</span>
        <h2>A good home for your next goodbye.</h2>
        <p>Take a peek at life with Encore.</p>
      </div>
      <div className="welcome-feature-tabs" role="tablist" aria-label="Explore Encore features">
        {features.map(({ id, icon: Icon, label }, index) => (
          <button
            key={id}
            id={`tour-tab-${id}`}
            role="tab"
            aria-selected={index === active}
            aria-controls="tour-panel"
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % features.length
                  : event.key === 'ArrowLeft'
                    ? (index + features.length - 1) % features.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? features.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                setActive(next);
                document.getElementById(`tour-tab-${features[next].id}`)?.focus();
              }
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      <div
        id="tour-panel"
        role="tabpanel"
        aria-labelledby={`tour-tab-${feature.id}`}
        className="welcome-feature-panel"
        tabIndex={0}
      >
        <div className="welcome-feature-caption">
          <div>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </div>
          <span>
            <ArrowUpRight size={15} /> Actual interface · demo data
          </span>
        </div>
        <div className="welcome-browser-frame">
          <div className="welcome-browser-toolbar">
            <span>
              <i />
              <i />
              <i />
            </span>
            <small>encore / {feature.label.toLowerCase()}</small>
            <span />
          </div>
          <img
            key={feature.image}
            src={`/showcase/${feature.image}.webp`}
            alt={feature.alt}
            width="1440"
            height="1000"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
