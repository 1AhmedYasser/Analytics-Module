import { randomColor } from './generateRandomColor';
import { OVERVIEW_GREEN, OVERVIEW_RED, OVERVIEW_YELLOW } from './overview-colors';
import {
  DistributionFeedbackApiBody,
  DistributionFeedbackData,
  DistributionFeedbackInput,
} from '../types/overview-api';

export type DistributionChartEntry = {
  readonly rating: number;
  readonly count: number;
};

export type DistributionColorEntry = {
  readonly id: string;
  readonly color: string;
};

export type DistributionResult = {
  readonly chartData: readonly DistributionChartEntry[];
  readonly colors: readonly DistributionColorEntry[];
  readonly isRatingDistribution: true;
  readonly totalFeedback: number;
  readonly totalChats: number;
  readonly noFeedbackCount: number;
  readonly isFiveScale: boolean;
  readonly yAxisMax: number;
};

const FIVE_SCALE_RATINGS = {
  green: [4, 5],
  five: [5],
  four: [4],
  yellow: [3],
  bucket2: [2],
  bucket1: [1],
} as const;

const TEN_SCALE_RATINGS = {
  greenHigh: [9, 10],
  greenMid: [7, 8],
  yellow: [5, 6],
  neutral: [3, 4],
  red: [0, 1, 2],
} as const;

export const getRatingBuckets = (isFiveScale: boolean) =>
  isFiveScale ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const getGreenRatings = (isFiveScale: boolean) =>
  isFiveScale ? [...FIVE_SCALE_RATINGS.green] : [...TEN_SCALE_RATINGS.greenHigh];

export const getYellowRatings = (isFiveScale: boolean) =>
  isFiveScale ? [...FIVE_SCALE_RATINGS.yellow] : [...TEN_SCALE_RATINGS.greenMid];

export type DistributionBucketGroup = {
  readonly label: string;
  readonly ratings: readonly number[];
  readonly count: number;
};

export const getDistributionBucketGroups = (
  chartData: readonly DistributionChartEntry[],
  isFiveScale: boolean
): DistributionBucketGroup[] => {
  const groupDefs = isFiveScale
    ? [
        { label: '5', ratings: FIVE_SCALE_RATINGS.five },
        { label: '4', ratings: FIVE_SCALE_RATINGS.four },
        { label: '3', ratings: FIVE_SCALE_RATINGS.yellow },
        { label: '2', ratings: FIVE_SCALE_RATINGS.bucket2 },
        { label: '1', ratings: FIVE_SCALE_RATINGS.bucket1 },
      ]
    : [
        { label: '9-10', ratings: TEN_SCALE_RATINGS.greenHigh },
        { label: '7-8', ratings: TEN_SCALE_RATINGS.greenMid },
        { label: '5-6', ratings: TEN_SCALE_RATINGS.yellow },
        { label: '3-4', ratings: TEN_SCALE_RATINGS.neutral },
        { label: '1-2', ratings: TEN_SCALE_RATINGS.red },
      ];

  const countByRating = new Map(chartData.map(({ rating, count }) => [rating, count]));
  return groupDefs.map(({ label, ratings }) => ({
    label,
    ratings,
    count: ratings.reduce((sum, rating) => sum + (countByRating.get(rating) ?? 0), 0),
  }));
};

export const getGreenCount = (chartData: readonly DistributionChartEntry[], isFiveScale: boolean) =>
  chartData
    .filter(({ rating }) => getGreenRatings(isFiveScale).includes(rating))
    .reduce((sum, { count }) => sum + count, 0);

export const colorForBucketLabel = (label: string, isFiveScale: boolean): string => {
  if (isFiveScale) {
    if (label === '5' || label === '4') return OVERVIEW_GREEN;
    if (label === '3') return OVERVIEW_YELLOW;
    return OVERVIEW_RED;
  }
  if (label === '9-10' || label === '7-8') return OVERVIEW_GREEN;
  if (label === '5-6') return OVERVIEW_YELLOW;
  return OVERVIEW_RED;
};

export const getRoundedDistributionMax = (maxCount: number) => {
  if (maxCount <= 10) return 10;
  return Math.ceil(maxCount / 10) * 10;
};

const parseDistributionFeedbackData = (body: DistributionFeedbackApiBody): DistributionFeedbackData => {
  const response = Array.isArray(body) ? body[0] : body;
  const raw = response?.result;
  if (raw && 'value' in raw && raw.value) {
    return JSON.parse(raw.value) as DistributionFeedbackData;
  }
  if (raw && !('value' in raw)) {
    return raw;
  }
  return response as DistributionFeedbackData;
};

export const mapDistributionChartData = (result: DistributionFeedbackInput): DistributionResult => {
  const body: DistributionFeedbackApiBody =
    'response' in result && result.response !== undefined ? result.response : result;
  const data = parseDistributionFeedbackData(body);
  const distribution = data?.distribution ?? [];
  const totalFeedback = data?.total_feedback ?? 0;
  const totalChats = data?.total_chats ?? 0;
  const scaleIsFive = data?.is_five_scale ?? false;
  const noFeedbackCount = totalChats - totalFeedback;
  const ratingBuckets = getRatingBuckets(scaleIsFive);
  const distributionByRating = distribution.reduce<Map<number, number>>((acc, entry) => {
    if (entry.rating === '-') return acc;

    const numericRating = Number(entry.rating);
    if (!Number.isFinite(numericRating) || !ratingBuckets.includes(numericRating)) {
      return acc;
    }

    acc.set(numericRating, entry.count);
    return acc;
  }, new Map<number, number>());

  const chartData = ratingBuckets.map((rating: number) => {
    const count = distributionByRating.get(rating) ?? 0;
    return {
      rating,
      count,
    };
  });

  const yAxisMax = getRoundedDistributionMax(Math.max(...chartData.map((entry) => entry.count), 0));

  const colors = [
    { id: 'count', color: '#FFB511' },
    ...chartData.map((entry) => ({
      id: String(entry.rating),
      color: randomColor(),
    })),
  ];

  return {
    chartData,
    colors,
    isRatingDistribution: true,
    totalFeedback,
    totalChats,
    noFeedbackCount,
    isFiveScale: scaleIsFive,
    yAxisMax,
  };
};
