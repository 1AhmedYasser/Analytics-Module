import React from 'react';
import KpiCard from '../KpiCard';
import { KpiFormat } from '../kpiFormat';
import { useOverviewKpis } from '../useOverviewKpis';
import { DateRange, OverviewUnit, periodLabelKey } from '../../../util/overview-date-utils';
import { OverviewSectionMetric } from '../../../types/overview-metrics';
import './styles.scss';

type Props = {
  readonly unit: OverviewUnit;
  readonly range: DateRange;
  readonly previousRange: DateRange;
  readonly isActive: (metric: OverviewSectionMetric) => boolean;
};

const primaryMetrics = new Set<OverviewSectionMetric>(['total_chats', 'avg_waiting_time', 'avg_rating']);

const cards: {
  readonly metric: OverviewSectionMetric;
  readonly titleKey: string;
  readonly format: KpiFormat;
  readonly key: 'totalChats' | 'avgWaitingTime' | 'avgRating' | 'burokrattRate' | 'csaRate' | 'redirectedRate' | 'leftWithoutAnswerRate';
}[] = [
  { metric: 'total_chats', titleKey: 'overview.metric.total_chats', format: 'number', key: 'totalChats' },
  { metric: 'avg_waiting_time', titleKey: 'overview.metric.avg_waiting_time', format: 'seconds', key: 'avgWaitingTime' },
  { metric: 'avg_rating', titleKey: 'overview.metric.avg_rating', format: 'rating', key: 'avgRating' },
  { metric: 'burokratt_rate', titleKey: 'overview.metric.burokratt_rate', format: 'percent', key: 'burokrattRate' },
  { metric: 'csa_rate', titleKey: 'overview.metric.csa_rate', format: 'percent', key: 'csaRate' },
  { metric: 'redirected_rate', titleKey: 'overview.metric.redirected_rate', format: 'percent', key: 'redirectedRate' },
  { metric: 'left_without_answer_rate', titleKey: 'overview.metric.left_without_answer_rate', format: 'percent', key: 'leftWithoutAnswerRate' },
];

const KpiCardsGrid = ({ unit, range, previousRange, isActive }: Props) => {
  const { current, previous } = useOverviewKpis(range, previousRange);
  const visibleCards = cards.filter((card) => isActive(card.metric));
  const primaryCards = visibleCards.filter((card) => primaryMetrics.has(card.metric));
  const secondaryCards = visibleCards.filter((card) => !primaryMetrics.has(card.metric));

  if (visibleCards.length === 0) return null;

  const renderCard = (card: (typeof cards)[number], highlighted: boolean) => (
    <KpiCard
      key={card.metric}
      titleKey={card.titleKey}
      value={current[card.key]}
      previousValue={previous[card.key]}
      format={card.format}
      periodLabelKey={periodLabelKey(unit)}
      highlighted={highlighted}
    />
  );

  return (
    <div className="kpi-cards-grid">
      {primaryCards.length > 0 && (
        <div className="kpi-cards-grid__row kpi-cards-grid__row--primary">
          {primaryCards.map((card) => renderCard(card, true))}
        </div>
      )}
      {secondaryCards.length > 0 && (
        <div className="kpi-cards-grid__row kpi-cards-grid__row--secondary">
          {secondaryCards.map((card) => renderCard(card, false))}
        </div>
      )}
    </div>
  );
};

export default KpiCardsGrid;
