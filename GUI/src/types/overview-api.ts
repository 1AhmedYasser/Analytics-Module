export type CountRow = {
  readonly count: number;
};

export type TimeCountRow = {
  readonly time: string;
  readonly count: number;
};

export type DateTimeCountRow = {
  readonly date_time: string;
  readonly count: number;
};

export type StatusEventRow = {
  readonly event: string;
  readonly count: number;
};

export type ThemeOverviewRow = {
  readonly theme: string;
  readonly count: number;
};

export type FollowUpActionRow = {
  readonly followUpAction: string;
  readonly count: number;
};

export type TotalChatsOverviewResponse = {
  readonly response: readonly [readonly TimeCountRow[], readonly TimeCountRow[]];
};

export type ChatsStatusesOverviewResponse = {
  readonly response: readonly [readonly DateTimeCountRow[]];
};

export type ChatsStatusesByEventResponse = {
  readonly response: readonly [readonly StatusEventRow[]];
};

export type ThemeOverviewResponse = {
  readonly response: readonly ThemeOverviewRow[];
};

export type FollowUpActionOverviewResponse = {
  readonly response: readonly FollowUpActionRow[];
};

export type MetricValueRow = {
  readonly metricValue: number;
};

export type AvgWaitingTimeOverviewResponse = {
  readonly response: readonly [unknown, unknown, readonly MetricValueRow[]];
};

export type AvgRatingOverviewResponse = {
  readonly response: readonly [MetricValueRow];
};

export type RedirectedOverviewRow = {
  readonly multiCsaChats?: number;
  readonly totalCsaChats?: number;
};

export type RedirectedOverviewResponse = {
  readonly response: readonly [RedirectedOverviewRow];
};

export type DistributionFeedbackData = {
  readonly distribution?: readonly { readonly rating: number | string; readonly count: number }[];
  readonly total_feedback?: number;
  readonly total_chats?: number;
  readonly is_five_scale?: boolean;
};

export type DistributionFeedbackResultWrapper = {
  readonly result?: { readonly value?: string } | DistributionFeedbackData;
};

export type DistributionFeedbackApiBody =
  | DistributionFeedbackData
  | DistributionFeedbackResultWrapper
  | readonly DistributionFeedbackResultWrapper[];

export type DistributionFeedbackResponse = {
  readonly response?: DistributionFeedbackApiBody;
};

export type DistributionFeedbackInput = DistributionFeedbackResponse | DistributionFeedbackApiBody;

export type OverviewDateRangeRequestData = Readonly<{
  start_date: string;
  end_date: string;
  urls: (string | null)[];
  showTest: boolean;
}>;

export type OverviewChartRequestData = Readonly<
  OverviewDateRangeRequestData & {
    period: 'hour' | 'day' | 'week';
    options: readonly string[];
    timezone: string;
  }
>;

export type ChatsStatusesRequestData = Readonly<
  OverviewDateRangeRequestData & {
    metric: 'hour' | 'day';
    events: readonly string[];
  }
>;
