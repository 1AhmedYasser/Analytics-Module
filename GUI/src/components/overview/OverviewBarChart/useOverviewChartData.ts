import { useEffect, useState } from 'react';
import { eachDayOfInterval, eachHourOfInterval, format, formatISO } from 'date-fns';
import { Methods, request } from '../../../util/axios-client';
import { getDomainsArray } from '../../../util/multiDomain-utils';
import { getShowTestData } from '../../../util/testChat-utils';
import { getChatsStatuses, getTotalChats } from '../../../resources/api-constants';
import { DateRange, OverviewUnit } from '../../../util/overview-date-utils';
import {
  ChatsStatusesOverviewResponse,
  ChatsStatusesRequestData,
  OverviewChartRequestData,
  TotalChatsOverviewResponse,
} from '../../../types/overview-api';

export type OverviewChartBucket = {
  readonly bucket: number;
  readonly burokratt: number;
  readonly csa: number;
  readonly leftWithoutAnswer: number;
};

const bucketKey = (date: string | Date, period: 'hour' | 'day'): string | null => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, period === 'hour' ? "yyyy-MM-dd'T'HH" : 'yyyy-MM-dd');
};

const toBucketEntries = (
  rows: Record<string, unknown>[],
  dateField: string,
  period: 'hour' | 'day'
): [string, number][] =>
  rows.reduce<[string, number][]>((entries, row) => {
    const key = bucketKey(row[dateField] as string | Date, period);
    if (key !== null) entries.push([key, Number(row.count)]);
    return entries;
  }, []);

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
      request<OverviewChartRequestData, TotalChatsOverviewResponse>({
        url: getTotalChats(),
        method: Methods.post,
        withCredentials: true,
        data: { options: ['byk', 'csa'], period, start_date, end_date, urls, showTest, timezone },
      }),
      request<ChatsStatusesRequestData, ChatsStatusesOverviewResponse>({
        url: getChatsStatuses(),
        method: Methods.post,
        withCredentials: true,
        data: { metric: period, start_date, end_date, events: ['CLIENT_LEFT_WITH_NO_RESOLUTION'], urls, showTest },
      }),
    ])
      .then(([totalCountRes, statusRes]) => {
        if (cancelled) return;
        const bykRows = totalCountRes.response?.[0] ?? [];
        const csaRows = totalCountRes.response?.[1] ?? [];
        const leftWithoutAnswerRows = statusRes.response?.[0] ?? [];

        const bykMap = new Map(toBucketEntries([...bykRows], 'time', period));
        const csaMap = new Map(toBucketEntries([...csaRows], 'time', period));
        const leftMap = new Map(toBucketEntries([...leftWithoutAnswerRows], 'date_time', period));

        const intervals =
          period === 'hour'
            ? eachHourOfInterval({ start: range.start, end: range.end })
            : eachDayOfInterval({ start: range.start, end: range.end });

        const newBuckets = intervals.map((date) => {
          const key = bucketKey(date, period) ?? '';
          return {
            bucket: date.getTime(),
            burokratt: bykMap.get(key) ?? 0,
            csa: csaMap.get(key) ?? 0,
            leftWithoutAnswer: leftMap.get(key) ?? 0,
          };
        });
        setBuckets(newBuckets);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime(), unit]);

  return buckets;
};
