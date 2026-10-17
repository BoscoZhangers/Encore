import { useEffect, useRef, useState } from 'react';
import { ChartNoAxesCombined, ChevronDown } from 'lucide-react';
import { InsightsSummary } from '../components/insights/InsightsSummary';

const periods = [
  ['month', 'This month'],
  ['previous-month', 'Last month'],
  ['all-time', 'All time'],
] as const;

export function Insights() {
  return (
    <div className="page insights-page">
      <InsightsContent />
      <p className="insights-note">
        Earnings and rehomed items reflect seller-confirmed completed sales. Negotiations count
        buyer offers received during the selected period.
      </p>
    </div>
  );
}

function InsightsContent() {
  const [period, setPeriod] = useState<(typeof periods)[number][0]>('month');
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const label = periods.find(([value]) => value === period)?.[1] ?? 'This month';

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <>
      <div className="insights-page-heading">
        <div>
          <p className="market-kicker">
            <ChartNoAxesCombined size={14} /> YOUR PROGRESS, AT A GLANCE
          </p>
          <h1>Insights</h1>
          <p>See how your things are finding their next chapter.</p>
        </div>
        <div className="insights-period-wrap" ref={menuRef}>
          <button
            className="insights-period"
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <ChartNoAxesCombined size={18} />
            <span>{label}</span>
            <ChevronDown size={15} className={open ? 'open' : ''} />
          </button>
          {open && (
            <div className="insights-period-menu" role="menu" aria-label="Insights period">
              {periods.map(([value, optionLabel]) => (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={period === value}
                  data-period={value}
                  onClick={() => {
                    setPeriod(value);
                    setOpen(false);
                  }}
                >
                  {optionLabel}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <InsightsSummary period={period} />
    </>
  );
}
