import { MinPointSize } from 'recharts/types/util/BarUtils';

export type ChartType = {
  label: string;
  value: string;
};

export type QualityData = {
  totalChats: number;
  chatsWithThemes: number;
  totalBuerokrattChats: number;
  buerokrattChatsWithQuality: number;
  chatsWithFollowUp: number;
};

export type ChartData = {
  chartData: Record<string, number | string>[];
  colors: { id: string; color: string }[];
  minPointSize?: MinPointSize;
  periodNps?: number;
  periodNpsByCsa?: Record<string, number>;
  distributionData?: ChartData;
  feedBackData?: ChartData;
  isRatingDistribution?: boolean;
  noFeedbackCount?: number;
  totalChats?: number;
  totalFeedback?: number;
  isFiveScale?: boolean;
  yAxisMax?: number;
  qualityData?: QualityData;
};
