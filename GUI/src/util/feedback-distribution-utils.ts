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
