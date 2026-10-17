import { ArrowUpRight, Leaf, MessageCircle, Package, WalletCards } from 'lucide-react';
import { cad } from '../../api';
import { useData } from '../../hooks/useData';
import { ErrorBox, Spinner } from '../ui';

export type InsightData = {
  totalEarnings: number;
  activeListings: number;
  agentNegotiations: number;
  rehomedItems: number;
  changes: {
    totalEarnings: number;
    activeListings: number;
    agentNegotiations: number;
    rehomedItems: number;
  };
};

function changeText(value: number, money = false) {
  if (!value) return money ? 'No change' : 'No new activity';
  return money
    ? `${value > 0 ? '+' : '-'}${cad(Math.abs(value))}`
    : `${value > 0 ? '+' : ''}${value}`;
}
export function InsightCards({
  data,
  period = 'month',
}: {
  data: InsightData;
  period?: 'month' | 'previous-month' | 'all-time';
}) {
  const periodLabel =
    period === 'month' ? 'this month' : period === 'previous-month' ? 'last month' : 'all time';
  const cards = [
    [
      'Total earnings',
      cad(data.totalEarnings),
      changeText(data.changes.totalEarnings, true),
      'seller-confirmed sales',
      WalletCards,
      data.changes.totalEarnings,
    ],
    [
      'Active listings',
      String(data.activeListings),
      changeText(data.changes.activeListings),
      'available right now',
      Package,
      data.changes.activeListings,
    ],
    [
      'Agent negotiations',
      String(data.agentNegotiations),
      changeText(data.changes.agentNegotiations),
      `offers ${periodLabel}`,
      MessageCircle,
      data.changes.agentNegotiations,
    ],
    [
      'Things rehomed',
      String(data.rehomedItems),
      changeText(data.changes.rehomedItems),
      `completed sales ${periodLabel}`,
      Leaf,
      data.changes.rehomedItems,
    ],
  ] as const;
  return (
    <div className="insight-card-grid">
      {cards.map(([label, value, change, note, Icon, trend]) => {
        const direction = trend < 0 ? 'down' : trend > 0 ? 'up' : 'steady';
        const path =
          direction === 'down'
            ? 'M2 4 16 8 29 6 43 16 56 12 70 21 84 18 102 27'
            : direction === 'up'
              ? 'M2 27 16 20 29 23 43 12 56 16 70 8 84 12 102 3'
              : 'M2 16 18 14 34 17 51 14 68 16 85 13 102 15';
        return (
          <article className={`insight-card trend-${direction}`} key={label}>
            <div className="insight-card-top">
              <span>{label}</span>
              <Icon size={25} />
            </div>
            <strong>{value}</strong>
            <svg
              className="insight-card-trend"
              viewBox="0 0 104 31"
              role="img"
              aria-label={`${label} trend is ${direction}`}
            >
              <path d={path} />
            </svg>
            <div className="insight-card-foot">
              <b>{change}</b>
              <span>{note}</span>
              <ArrowUpRight size={13} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function InsightsSummary({
  compact = false,
  period = 'month',
}: {
  compact?: boolean;
  period?: 'month' | 'previous-month' | 'all-time';
}) {
  const { data, error } = useData(`/seller/insights?period=${period}`, 15000);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  return (
    <section
      className={`insights-summary${compact ? ' compact' : ''}`}
      aria-labelledby="insights-summary-title"
    >
      <div className="insights-summary-heading">
        <div>
          <p className="market-kicker">YOUR PROGRESS, AT A GLANCE</p>
          <h2 id="insights-summary-title">
            {period === 'month'
              ? 'Your month at a glance'
              : period === 'previous-month'
                ? 'Your last month at a glance'
                : 'Your progress at a glance'}
          </h2>
        </div>
        {compact && (
          <a className="insights-view-link" href="/insights">
            View insights <ArrowUpRight size={14} />
          </a>
        )}
      </div>
      <InsightCards data={data} period={period} />
    </section>
  );
}
