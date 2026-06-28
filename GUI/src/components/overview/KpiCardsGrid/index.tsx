import React from 'react';
import KpiCard from '../KpiCard';
import { KpiFormat } from '../kpiFormat';
import { useOverviewKpis } from '../useOverviewKpis';
import { DateRange, OverviewUnit, periodLabelKey } from '../../../util/overview-date-utils';
import './styles.scss';

type Props = {
  unit: OverviewUnit;
  range: DateRange;
  previousRange: DateRange;
  isActive: (metric: string) => boolean;
};

const cards: { metric: string; titleKey: string; format: KpiFormat; key: 'totalChats' | 'avgWaitingTime' | 'avgRating' | 'burokrattRate' | 'csaRate' | 'redirectedRate' | 'leftWithoutAnswerRate' }[] = [
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

  if (visibleCards.length === 0) return null;

  return (
    <div className="kpi-cards-grid">
      {visibleCards.map((card) => (
        <KpiCard
          key={card.metric}
          titleKey={card.titleKey}
          value={current[card.key]}
          previousValue={previous[card.key]}
          format={card.format}
          periodLabelKey={periodLabelKey(unit)}
        />
      ))}
    </div>
  );
};

export default KpiCardsGrid;
