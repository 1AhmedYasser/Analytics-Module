import { useEffect, useState } from 'react';
import { eachDayOfInterval, eachHourOfInterval, format, formatISO } from 'date-fns';
import { Methods, request } from '../../../util/axios-client';
import { getDomainsArray } from '../../../util/multiDomain-utils';
import { getShowTestData } from '../../../util/testChat-utils';
import { getChatsStatuses, getTotalChats } from '../../../resources/api-constants';
import { DateRange, OverviewUnit } from '../../../util/overview-date-utils';

export type OverviewChartBucket = {
  bucket: number;
  burokratt: number;
  csa: number;
  leftWithoutAnswer: number;
};

const bucketKey = (date: string | Date, period: 'hour' | 'day'): string =>
  format(new Date(date), period === 'hour' ? "yyyy-MM-dd'T'HH" : 'yyyy-MM-dd');

export const useOverviewChartData = (range: DateRange, unit: OverviewUnit) => {
  const [buckets, setBuckets] = useState<OverviewChartBucket[]>([]);

  useEffect(() => {
    let cancelled = false;
    const period = unit === 'day' ? 'hour' : 'day';
    const urls = getDomainsArray();
    const showTest = getShowTestData();
    const start_date = formatISO(range.start);
    const end_date = formatISO(range.end);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    Promise.all([
      request<any, any>({
        url: getTotalChats(),
        method: Methods.post,
        withCredentials: true,
        data: { options: ['byk', 'csa'], period, start_date, end_date, urls, showTest, timezone },
      }),
      request<any, any>({
        url: getChatsStatuses(),
        method: Methods.post,
        withCredentials: true,
        data: { metric: period, start_date, end_date, events: ['CLIENT_LEFT_WITH_NO_RESOLUTION'], urls, showTest },
      }),
    ])
      .then(([totalCountRes, statusRes]: any[]) => {
        if (cancelled) return;
        const bykRows: { time: string; count: number }[] = totalCountRes.response?.[0] ?? [];
        const csaRows: { time: string; count: number }[] = totalCountRes.response?.[1] ?? [];
        const leftWithoutAnswerRows: { date_time: string; count: number }[] = statusRes.response?.[0] ?? [];

        const bykMap = new Map(bykRows.map((r) => [bucketKey(r.time, period), Number(r.count)]));
        const csaMap = new Map(csaRows.map((r) => [bucketKey(r.time, period), Number(r.count)]));
        const leftMap = new Map(leftWithoutAnswerRows.map((r) => [bucketKey(r.date_time, period), Number(r.count)]));

        const intervals =
          period === 'hour'
            ? eachHourOfInterval({ start: range.start, end: range.end })
            : eachDayOfInterval({ start: range.start, end: range.end });

        setBuckets(
          intervals.map((date) => {
            const key = bucketKey(date, period);
            return {
              bucket: date.getTime(),
              burokratt: bykMap.get(key) ?? 0,
              csa: csaMap.get(key) ?? 0,
              leftWithoutAnswer: leftMap.get(key) ?? 0,
            };
          })
        );
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime(), unit]);

  return buckets;
};
