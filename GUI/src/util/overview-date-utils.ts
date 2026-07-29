import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';

export type AnchorUnit = 'day' | 'week' | 'month';

export type OverviewUnit = AnchorUnit | 'period';

export type DateRange = { readonly start: Date; readonly end: Date };

export const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export const getRange = (unit: AnchorUnit, anchorDate: Date): DateRange => {
  switch (unit) {
    case 'week':
      return { start: startOfWeek(anchorDate, WEEK_OPTIONS), end: endOfWeek(anchorDate, WEEK_OPTIONS) };
    case 'month':
      return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) };
    default:
      return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
  }
};

export const shiftAnchor = (unit: AnchorUnit, anchorDate: Date, direction: 1 | -1): Date => {
  switch (unit) {
    case 'week':
      return direction === 1 ? addWeeks(anchorDate, 1) : subWeeks(anchorDate, 1);
    case 'month':
      return direction === 1 ? addMonths(anchorDate, 1) : subMonths(anchorDate, 1);
    default:
      return direction === 1 ? addDays(anchorDate, 1) : subDays(anchorDate, 1);
  }
};

export const getPreviousRange = (unit: AnchorUnit, anchorDate: Date): DateRange =>
  getRange(unit, shiftAnchor(unit, anchorDate, -1));

export const getPreviousPeriodRange = (range: DateRange): DateRange => {
  const days = differenceInCalendarDays(range.end, range.start) + 1;
  return {
    start: startOfDay(subDays(range.start, days)),
    end: endOfDay(subDays(range.start, 1)),
  };
};

export const isWeeklyBucketPeriod = (range: DateRange): boolean => isAfter(range.end, addMonths(range.start, 1));

export const isLongPeriod = (range: DateRange): boolean => isAfter(range.end, addMonths(range.start, 5));

export const formatOverviewDate = (date: Date): string => format(date, 'd.MM');

export const periodLabelKey = (unit: OverviewUnit): string => {
  switch (unit) {
    case 'week':
      return 'overview.lastWeek';
    case 'month':
      return 'overview.lastMonth';
    case 'period':
      return 'overview.lastPeriod';
    default:
      return 'overview.lastDay';
  }
};
