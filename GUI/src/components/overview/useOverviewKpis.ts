import { useEffect, useState } from 'react';
import { formatISO } from 'date-fns';
import { Methods, request } from '../../util/axios-client';
import { getDomainsArray } from '../../util/multiDomain-utils';
import { getShowTestData } from '../../util/testChat-utils';
import { getAverageFeedbackOnBuerokrattChats, getRedirectedOverview, getTotalChats, getAvgChatWaitingTime, getChatsStatuses } from '../../resources/api-constants';
import { DateRange } from '../../util/overview-date-utils';

export type OverviewKpiValues = {
  totalChats: number;
  avgWaitingTime: number;
  avgRating: number;
  burokrattRate: number;
  csaRate: number;
  redirectedRate: number;
  leftWithoutAnswerRate: number;
};

const emptyKpis: OverviewKpiValues = {
  totalChats: 0,
  avgWaitingTime: 0,
  avgRating: 0,
  burokrattRate: 0,
  csaRate: 0,
  redirectedRate: 0,
  leftWithoutAnswerRate: 0,
};

const sumCounts = (rows: { count: number }[] | undefined): number =>
  (rows ?? []).reduce((sum, row) => sum + Number(row.count ?? 0), 0);

const fetchKpisForRange = async (range: DateRange): Promise<OverviewKpiValues> => {
  const urls = getDomainsArray();
  const showTest = getShowTestData();
  const start_date = formatISO(range.start);
  const end_date = formatISO(range.end);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [totalCountRes, waitingTimeRes, ratingRes, redirectedRes, statusRes]: any[] = await Promise.all([
    request({
      url: getTotalChats(),
      method: Methods.post,
      withCredentials: true,
      data: { options: ['byk', 'csa'], period: 'day', start_date, end_date, urls, showTest, timezone },
    }),
    request({
      url: getAvgChatWaitingTime(),
      method: Methods.post,
      withCredentials: true,
      data: { options: ['handoff'], period: 'day', start_date, end_date, urls, showTest },
    }),
    request({
      url: getAverageFeedbackOnBuerokrattChats(),
      method: Methods.post,
      withCredentials: true,
      data: { combined: true, start_date, end_date, urls, showTest },
    }),
    request({
      url: getRedirectedOverview(),
      method: Methods.post,
      withCredentials: true,
      data: { start_date, end_date, urls, showTest },
    }),
    request({
      url: getChatsStatuses(),
      method: Methods.post,
      withCredentials: true,
      data: {
        metric: 'day',
        start_date,
        end_date,
        events: ['CLIENT_LEFT_WITH_NO_RESOLUTION'],
        urls,
        showTest,
      },
    }),
  ]);

  const byk = sumCounts(totalCountRes.response?.[0]);
  const csa = sumCounts(totalCountRes.response?.[1]);
  const totalChats = byk + csa;
  const leftWithoutAnswer = sumCounts(statusRes.response?.[0]);
  const { multiCsaChats = 0, totalCsaChats = 0 } = redirectedRes.response?.[0] ?? {};

  return {
    totalChats,
    avgWaitingTime: Number(waitingTimeRes.response?.[2]?.[0]?.metricValue ?? 0),
    avgRating: Number(ratingRes.response?.[0]?.metricValue ?? 0),
    burokrattRate: totalChats > 0 ? 100 - (byk / totalChats) * 100 : 0,
    csaRate: totalChats > 0 ? 100 - (csa / totalChats) * 100 : 0,
    redirectedRate: totalCsaChats > 0 ? 100 - (multiCsaChats / totalCsaChats) * 100 : 0,
    leftWithoutAnswerRate: totalChats > 0 ? 100 - (leftWithoutAnswer / totalChats) * 100 : 0,
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
