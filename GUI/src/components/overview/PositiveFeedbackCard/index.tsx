import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatISO } from 'date-fns';
import Card from '../../Card';
import Track from '../../Track';
import ProgressBar from '../../ProgressBar';
import KpiValue from '../KpiValue';
import { Methods, request } from '../../../util/axios-client';
import { getDistributionOnBuerokrattChatsFeedback } from '../../../resources/api-constants';
import { getDomainsArray } from '../../../util/multiDomain-utils';
import { getShowTestData } from '../../../util/testChat-utils';
import { DistributionResult, getGreenRatings, getYellowRatings, mapDistributionChartData } from '../../../util/feedback-distribution-utils';
import { DateRange, OverviewUnit, periodLabelKey } from '../../../util/overview-date-utils';
import './styles.scss';

const GREEN = '#3E9142';
const YELLOW = '#E5A82E';
const RED = '#B72727';

type Props = {
  range: DateRange;
  previousRange: DateRange;
  unit: OverviewUnit;
};

const fetchDistribution = async (range: DateRange): Promise<DistributionResult> => {
  const result = await request<any, any>({
    url: getDistributionOnBuerokrattChatsFeedback(),
    method: Methods.post,
    withCredentials: true,
    data: {
      start_date: formatISO(range.start),
      end_date: formatISO(range.end),
      urls: getDomainsArray(),
      showTest: getShowTestData(),
    },
  });
  return mapDistributionChartData(result);
};

const positivePercentOf = (distribution: DistributionResult): number => {
  const green = getGreenRatings(distribution.isFiveScale);
  const greenCount = distribution.chartData.filter((d) => green.includes(d.rating)).reduce((sum, d) => sum + d.count, 0);
  return distribution.totalFeedback > 0 ? (greenCount / distribution.totalFeedback) * 100 : 0;
};

const colorForRating = (rating: number, isFiveScale: boolean): string => {
  if (getGreenRatings(isFiveScale).includes(rating)) return GREEN;
  if (getYellowRatings(isFiveScale).includes(rating)) return YELLOW;
  return RED;
};

const PositiveFeedbackCard = ({ range, previousRange, unit }: Props) => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<DistributionResult | null>(null);
  const [previous, setPrevious] = useState<DistributionResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchDistribution(range), fetchDistribution(previousRange)])
      .then(([c, p]) => {
        if (cancelled) return;
        setCurrent(c);
        setPrevious(p);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime(), previousRange.start.getTime(), previousRange.end.getTime()]);

  if (!current) return null;

  const positivePercent = positivePercentOf(current);
  const previousPositivePercent = previous ? positivePercentOf(previous) : 0;
  const sortedRows = [...current.chartData].sort((a, b) => b.rating - a.rating);

  return (
    <Card>
      <Track className="overview-list-card__title">{t('overview.positiveFeedback')}</Track>
      <KpiValue value={positivePercent} previousValue={previousPositivePercent} format="percent" periodLabelKey={periodLabelKey(unit)} />
      <Track direction="vertical" align="stretch" gap={8} className="overview-list-card__rows">
        {sortedRows.map((row) => (
          <Track key={row.rating} gap={8} className="overview-list-card__row">
            <span className="overview-list-card__row-label">{row.rating}</span>
            <ProgressBar value={row.count} max={current.totalFeedback} color={colorForRating(row.rating, current.isFiveScale)} />
            <span className="overview-list-card__row-count">{row.count}</span>
          </Track>
        ))}
      </Track>
    </Card>
  );
};

export default PositiveFeedbackCard;
