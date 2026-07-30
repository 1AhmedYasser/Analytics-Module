import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatISO } from 'date-fns';
import { MdArrowUpward } from 'react-icons/md';
import Card from '../../Card';
import Track from '../../Track';
import Icon from '../../Icon';
import ProgressBar from '../../ProgressBar';
import { Methods, request } from '../../../util/axios-client';
import {
  getDistributionOnBuerokrattChatsFeedback,
  getDistributionOnCSAChatsFeedback,
} from '../../../resources/api-constants';
import { getDomainsArray } from '../../../util/multiDomain-utils';
import { getShowTestData } from '../../../util/testChat-utils';
import {
  colorForBucketLabel,
  DistributionResult,
  getDistributionBucketGroups,
  getGreenCount,
  mapDistributionChartData,
  mergeDistributionResults,
} from '../../../util/feedback-distribution-utils';
import { DateRange, OverviewUnit, periodLabelKey } from '../../../util/overview-date-utils';
import { DistributionFeedbackResponse, OverviewDateRangeRequestData } from '../../../types/overview-api';
import { formatKpiValue } from '../kpiFormat';
import '../overviewSecondaryCard.scss';

type Props = {
  readonly range: DateRange;
  readonly previousRange: DateRange;
  readonly unit: OverviewUnit;
};

const fetchDistributionFrom = async (url: string, range: DateRange): Promise<DistributionResult> => {
  const result = await request<OverviewDateRangeRequestData, DistributionFeedbackResponse>({
    url,
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

const fetchDistribution = async (range: DateRange): Promise<DistributionResult> => {
  const [buerokratt, csa] = await Promise.all([
    fetchDistributionFrom(getDistributionOnBuerokrattChatsFeedback(), range),
    fetchDistributionFrom(getDistributionOnCSAChatsFeedback(), range),
  ]);
  return mergeDistributionResults(buerokratt, csa);
};

const positivePercentOf = (distribution: DistributionResult): number => {
  const greenCount = getGreenCount(distribution.chartData, distribution.isFiveScale);
  return distribution.totalFeedback > 0 ? (greenCount / distribution.totalFeedback) * 100 : 0;
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

  if (current.totalFeedback === 0) {
    return (
      <Card>
        <Track className="overview-secondary-card__header">{t('overview.positiveFeedback')}</Track>
        <p className="overview-secondary-card__empty">{t('overview.noData')}</p>
      </Card>
    );
  }

  const positivePercent = positivePercentOf(current);
  const greenCount = getGreenCount(current.chartData, current.isFiveScale);
  const previousGreenCount = previous ? getGreenCount(previous.chartData, previous.isFiveScale) : 0;
  const previousTotal = previous?.totalFeedback ?? 0;
  const bucketRows = getDistributionBucketGroups(current.chartData, current.isFiveScale);
  const maxBucketCount = Math.max(...bucketRows.map((row) => row.count), 1);

  return (
    <Card>
      <Track className="overview-secondary-card__header">{t('overview.positiveFeedback')}</Track>
      <div className="overview-secondary-card__body">
        <div className="overview-secondary-card__summary">
          <h2 className="overview-secondary-card__value">{formatKpiValue(positivePercent, 'percent')}</h2>
          <Track gap={2} className="overview-secondary-card__ratio">
            <Icon icon={<MdArrowUpward />} size="small" />
            <span>
              {greenCount}/{current.totalFeedback}
            </span>
          </Track>
          {previous && previousTotal > 0 && (
            <div className="overview-secondary-card__previous">
              {t(periodLabelKey(unit))} {previousGreenCount}/{previousTotal}
            </div>
          )}
        </div>
        <Track direction="vertical" align="stretch" gap={8} className="overview-secondary-card__distribution">
          {bucketRows.map((row) => (
            <Track key={row.label} gap={8} className="overview-secondary-card__row">
              <span className="overview-secondary-card__row-label overview-secondary-card__row-label--bucket">{row.label}</span>
              <ProgressBar
                value={row.count}
                max={maxBucketCount}
                color={colorForBucketLabel(row.label, current.isFiveScale)}
              />
              <span className="overview-secondary-card__row-count">{row.count}</span>
            </Track>
          ))}
        </Track>
      </div>
    </Card>
  );
};

export default PositiveFeedbackCard;
