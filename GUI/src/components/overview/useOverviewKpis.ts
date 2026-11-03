import { useEffect, useState } from 'react';
import { formatISO } from 'date-fns';
import { Methods, request } from '../../util/axios-client';
import { getDomainsArray } from '../../util/multiDomain-utils';
import { getShowTestData } from '../../util/testChat-utils';
import { getRedirectedOverview, getTotalChats, getAvgChatWaitingTime, getChatsStatuses } from '../../resources/api-constants';
import { DateRange } from '../../util/overview-date-utils';
import { DistributionResult } from '../../util/feedback-distribution-utils';
import { fetchDistribution } from './PositiveFeedbackCard';
import {
  AvgWaitingTimeOverviewResponse,
  ChatsStatusesOverviewResponse,
  ChatsStatusesRequestData,
  CountRow,
  OverviewChartRequestData,
  OverviewDateRangeRequestData,
  RedirectedOverviewResponse,
  TotalChatsOverviewResponse,
} from '../../types/overview-api';

export type OverviewKpiValues = {
  readonly totalChats: number;
  readonly avgWaitingTime: number;
  readonly isCsaEnabled: boolean;
  readonly avgRating: number;
  readonly isFiveScale: boolean;
  readonly burokrattRate: number;
  readonly csaRate: number;
  readonly redirectedRate: number;
  readonly leftWithoutAnswerRate: number;
};

const emptyKpis: OverviewKpiValues = {
  totalChats: 0,
  avgWaitingTime: 0,
  isCsaEnabled: true,
  avgRating: 0,
  isFiveScale: false,
  burokrattRate: 0,
  csaRate: 0,
  redirectedRate: 0,
  leftWithoutAnswerRate: 0,
};

const sumCounts = (rows: readonly CountRow[] | undefined): number =>
  (rows ?? []).reduce((sum, row) => sum + Number(row.count ?? 0), 0);

const getFeedbackScore = ({ chartData, totalFeedback, isFiveScale }: DistributionResult): number => {
  if (totalFeedback <= 0) return 0;
  const countFor = (ratings: number[]) =>
    chartData.filter(({ rating }) => ratings.includes(rating)).reduce((sum, { count }) => sum + count, 0);
  if (isFiveScale) return (countFor([5]) / totalFeedback) * 100;
  return ((countFor([9, 10]) - countFor([0, 1, 2, 3, 4, 5, 6])) / totalFeedback) * 100;
};

const fetchKpisForRange = async (range: DateRange): Promise<OverviewKpiValues> => {
  const urls = getDomainsArray();
  const showTest = getShowTestData();
  const start_date = formatISO(range.start);
  const end_date = formatISO(range.end);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const chartRequestData: OverviewChartRequestData = {
    options: ['byk', 'csa'],
    period: 'day',
    start_date,
    end_date,
    urls,
    showTest,
    timezone,
  };

  const dateRangeRequestData: OverviewDateRangeRequestData = {
    start_date,
    end_date,
    urls,
    showTest,
  };

  const statusRequestData: ChatsStatusesRequestData = {
    metric: 'day',
    start_date,
    end_date,
    events: ['CLIENT_LEFT_WITH_NO_RESOLUTION'],
    urls,
    showTest,
  };

  const [totalCountRes, waitingTimeRes, feedbackDistribution, redirectedRes, statusRes] = await Promise.all([
    request<OverviewChartRequestData, TotalChatsOverviewResponse>({
      url: getTotalChats(),
      method: Methods.post,
      withCredentials: true,
      data: chartRequestData,
    }),
    request<OverviewChartRequestData, AvgWaitingTimeOverviewResponse>({
      url: getAvgChatWaitingTime(),
      method: Methods.post,
      withCredentials: true,
      data: { ...chartRequestData, options: ['handoff'] },
    }),
    fetchDistribution(range),
    request<OverviewDateRangeRequestData, RedirectedOverviewResponse>({
      url: getRedirectedOverview(),
      method: Methods.post,
      withCredentials: true,
      data: dateRangeRequestData,
    }),
    request<ChatsStatusesRequestData, ChatsStatusesOverviewResponse>({
      url: getChatsStatuses(),
      method: Methods.post,
      withCredentials: true,
      data: statusRequestData,
    }),
  ]);

  const byk = sumCounts(totalCountRes.response?.[0]);
  const csa = sumCounts(totalCountRes.response?.[1]);
  const totalChats = byk + csa;
  const leftWithoutAnswer = sumCounts(statusRes.response?.[0]);
  const { multiCsaChats = 0, totalCsaChats = 0 } = redirectedRes.response?.[0] ?? {};
  const waitingTime = waitingTimeRes.response?.[2]?.[0];

  return {
    totalChats,
    avgWaitingTime: Number(waitingTime?.metricValue ?? 0),
    isCsaEnabled: waitingTime?.csaEnabled ?? false,
    avgRating: getFeedbackScore(feedbackDistribution),
    isFiveScale: feedbackDistribution.isFiveScale,
    burokrattRate: totalChats > 0 ? (byk / totalChats) * 100 : 0,
    csaRate: totalChats > 0 ? (csa / totalChats) * 100 : 0,
    redirectedRate: totalCsaChats > 0 ? (multiCsaChats / totalCsaChats) * 100 : 0,
    leftWithoutAnswerRate: totalChats > 0 ? (leftWithoutAnswer / totalChats) * 100 : 0,
  };
};

export const useOverviewKpis = (range: DateRange, previousRange: DateRange) => {
  const [current, setCurrent] = useState<OverviewKpiValues>(emptyKpis);
  const [previous, setPrevious] = useState<OverviewKpiValues>(emptyKpis);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchKpisForRange(range), fetchKpisForRange(previousRange)])
      .then(([currentValues, previousValues]) => {
        if (cancelled) return;
        setCurrent(currentValues);
        setPrevious(previousValues);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime(), previousRange.start.getTime(), previousRange.end.getTime()]);

  return { current, previous };
};
