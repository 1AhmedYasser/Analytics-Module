export const OVERVIEW_SECTION_METRICS = [
  'total_chats',
  'avg_waiting_time',
  'avg_rating',
  'burokratt_rate',
  'csa_rate',
  'redirected_rate',
  'left_without_answer_rate',
  'chart',
  'positive_feedback',
  'quality',
  'themes',
  'follow_up',
] as const;

export type OverviewSectionMetric = (typeof OVERVIEW_SECTION_METRICS)[number];

export interface OverviewMetricPreference {
  metric: string
  active: boolean
  ordinality: number
}

export interface OverviewMetricData {
  metric: string
  data: {
    left: number
    right: number
  }
}

export interface OverviewDatePreference {
  unit: string
}
