import { useEffect, useState } from 'react';
import { eachDayOfInterval, eachHourOfInterval, eachWeekOfInterval, format, formatISO, startOfWeek } from 'date-fns';
import { Methods, request } from '../../../util/axios-client';
import { getDomainsArray } from '../../../util/multiDomain-utils';
import { getShowTestData } from '../../../util/testChat-utils';
import { getTotalChats } from '../../../resources/api-constants';
import { DateRange, isWeeklyBucketPeriod, OverviewUnit, WEEK_OPTIONS } from '../../../util/overview-date-utils';
import { OverviewChartRequestData, TotalChatsOverviewResponse } from '../../../types/overview-api';

export type OverviewChartPeriod = 'hour' | 'day' | 'week';

export type OverviewChartBucket = {
  readonly bucket: number;
  readonly burokratt: number;
  readonly csa: number;
};

const bucketKey = (date: string | Date, period: OverviewChartPeriod): string | null => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  if (period === 'hour') return format(parsed, "yyyy-MM-dd'T'HH");
  if (period === 'week') return format(startOfWeek(parsed, WEEK_OPTIONS), 'yyyy-MM-dd');
  return format(parsed, 'yyyy-MM-dd');
};

const toBucketEntries = (
  rows: Record<string, unknown>[],
  dateField: string,
  period: OverviewChartPeriod
): [string, number][] =>
  rows.reduce<[string, number][]>((entries, row) => {
    const key = bucketKey(row[dateField] as string | Date, period);
    if (key !== null) entries.push([key, Number(row.count)]);
    return entries;
  }, []);

const getChartPeriod = (range: DateRange, unit: OverviewUnit): OverviewChartPeriod => {
  if (unit === 'day') return 'hour';
  return isWeeklyBucketPeriod(range) ? 'week' : 'day';
};

const getIntervals = (range: DateRange, period: OverviewChartPeriod): Date[] => {
  if (period === 'hour') return eachHourOfInterval({ start: range.start, end: range.end });
  if (period === 'week') return eachWeekOfInterval({ start: range.start, end: range.end }, WEEK_OPTIONS);
  return eachDayOfInterval({ start: range.start, end: range.end });
};

export const useOverviewChartData = (range: DateRange, unit: OverviewUnit) => {
  const [buckets, setBuckets] = useState<OverviewChartBucket[]>([]);
  const period = getChartPeriod(range, unit);

  useEffect(() => {
    let cancelled = false;
    const urls = getDomainsArray();
    const showTest = getShowTestData();
    const start_date = formatISO(range.start);
    const end_date = formatISO(range.end);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    request<OverviewChartRequestData, TotalChatsOverviewResponse>({
      url: getTotalChats(),
      method: Methods.post,
      withCredentials: true,
      data: { options: ['byk', 'csa'], period, start_date, end_date, urls, showTest, timezone },
    })
      .then((totalCountRes) => {
        if (cancelled) return;
        const bykRows = totalCountRes.response?.[0] ?? [];
        const csaRows = totalCountRes.response?.[1] ?? [];

        const bykMap = new Map(toBucketEntries([...bykRows], 'time', period));
        const csaMap = new Map(toBucketEntries([...csaRows], 'time', period));

        const intervals = getIntervals(range, period);

        const newBuckets = intervals.map((date) => {
          const key = bucketKey(date, period) ?? '';
          return {
            bucket: date.getTime(),
            burokratt: bykMap.get(key) ?? 0,
            csa: csaMap.get(key) ?? 0,
          };
        });
        setBuckets(newBuckets);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime(), unit, period]);

  return { buckets, period };
};
