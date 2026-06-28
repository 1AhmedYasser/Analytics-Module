import { randomColor } from './generateRandomColor';

export type DistributionResult = {
  chartData: { rating: number; count: number }[];
  colors: { id: string; color: string }[];
  isRatingDistribution: true;
  totalFeedback: number;
  totalChats: number;
  noFeedbackCount: number;
  isFiveScale: boolean;
  yAxisMax: number;
};

export const getRatingBuckets = (isFiveScale: boolean) =>
  isFiveScale ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const getGreenRatings = (isFiveScale: boolean) => (isFiveScale ? [4, 5] : [9, 10]);

export const getYellowRatings = (isFiveScale: boolean) => (isFiveScale ? [3] : [7, 8]);

export type DistributionBucketGroup = {
  label: string;
  ratings: number[];
  count: number;
};

export const getDistributionBucketGroups = (
  chartData: { rating: number; count: number }[],
  isFiveScale: boolean,
): DistributionBucketGroup[] => {
  const groupDefs = isFiveScale
    ? [
        { label: '4-5', ratings: [4, 5] },
        { label: '3', ratings: [3] },
        { label: '2', ratings: [2] },
        { label: '1', ratings: [1] },
      ]
    : [
        { label: '9-10', ratings: [9, 10] },
        { label: '7-8', ratings: [7, 8] },
        { label: '5-6', ratings: [5, 6] },
        { label: '3-4', ratings: [3, 4] },
        { label: '1-2', ratings: [0, 1, 2] },
      ];

  const countByRating = new Map(chartData.map(({ rating, count }) => [rating, count]));
  return groupDefs.map(({ label, ratings }) => ({
    label,
    ratings,
    count: ratings.reduce((sum, rating) => sum + (countByRating.get(rating) ?? 0), 0),
  }));
};

export const getGreenCount = (chartData: { rating: number; count: number }[], isFiveScale: boolean) =>
  chartData
    .filter(({ rating }) => getGreenRatings(isFiveScale).includes(rating))
    .reduce((sum, { count }) => sum + count, 0);

const BUCKET_GREEN = '#3E9142';
const BUCKET_YELLOW = '#E5A82E';
const BUCKET_RED = '#B72727';

export const colorForBucketLabel = (label: string, isFiveScale: boolean): string => {
  if (isFiveScale) {
    if (label === '4-5') return BUCKET_GREEN;
    if (label === '3') return BUCKET_YELLOW;
    return BUCKET_RED;
  }
  if (label === '9-10' || label === '7-8') return BUCKET_GREEN;
  if (label === '5-6') return BUCKET_YELLOW;
  return BUCKET_RED;
};

export const getRoundedDistributionMax = (maxCount: number) => {
  if (maxCount <= 10) return 10;
  return Math.ceil(maxCount / 10) * 10;
};

export const mapDistributionChartData = (result: any): DistributionResult => {
  const response = result.response ?? result;
  const raw = Array.isArray(response) ? response[0] : response;
  const data: {
    distribution?: {
      rating: number | string;
      count: number;
    }[];
    total_feedback?: number;
    total_chats?: number;
    is_five_scale?: boolean;
  } = raw?.result?.value ? JSON.parse(raw.result.value) : raw?.result ?? raw;
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
