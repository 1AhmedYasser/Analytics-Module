import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';

export type OverviewUnit = 'day' | 'week' | 'month';

export type DateRange = { readonly start: Date; readonly end: Date };

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export const getRange = (unit: OverviewUnit, anchorDate: Date): DateRange => {
  switch (unit) {
    case 'week':
      return { start: startOfWeek(anchorDate, WEEK_OPTIONS), end: endOfWeek(anchorDate, WEEK_OPTIONS) };
    case 'month':
      return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) };
    default:
      return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
  }
};

export const shiftAnchor = (unit: OverviewUnit, anchorDate: Date, direction: 1 | -1): Date => {
  switch (unit) {
    case 'week':
      return direction === 1 ? addWeeks(anchorDate, 1) : subWeeks(anchorDate, 1);
    case 'month':
      return direction === 1 ? addMonths(anchorDate, 1) : subMonths(anchorDate, 1);
    default:
      return direction === 1 ? addDays(anchorDate, 1) : subDays(anchorDate, 1);
  }
};

export const getPreviousRange = (unit: OverviewUnit, anchorDate: Date): DateRange =>
  getRange(unit, shiftAnchor(unit, anchorDate, -1));

export const periodLabelKey = (unit: OverviewUnit): string => {
  switch (unit) {
    case 'week':
      return 'overview.lastWeek';
    case 'month':
      return 'overview.lastMonth';
    default:
      return 'overview.lastDay';
  }
};

export const formatOverviewChartTitleRange = (range: DateRange, unit: OverviewUnit): string => {
  const sameMonth = range.start.getMonth() === range.end.getMonth() && range.start.getFullYear() === range.end.getFullYear();

  switch (unit) {
    case 'week':
      return sameMonth
        ? `${format(range.start, 'd')}-${format(range.end, 'd. MMM')}`
        : `${format(range.start, 'd.MM')} - ${format(range.end, 'd.MM')}`;
    case 'month':
      return format(range.start, 'MMMM yyyy');
    default:
      return format(range.start, 'd.MM');
  }
};
