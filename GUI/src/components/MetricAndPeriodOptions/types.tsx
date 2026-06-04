export interface Option {
  id: string;
  labelKey: string;
  additionalKey?: string;
  subOptions?: SubOption[];
  subRadioOptions?: { id: string; labelKey: string; color?: string }[];
  unit?: string;
  defaultChartType?: string;
}

export interface SubOption {
  id: string;
  labelKey: string;
  isSelected?: boolean;
  color?: string;
}

export type PeriodType = 'today' | 'yesterday' | 'last30days' | 'month' | '';

export type GroupByPeriod = 'hour' | 'day' | '';

export interface MetricOptionsState {
  period: PeriodType;
  metric: string;

  start: string;
  end: string;
  options: string[];
  groupByPeriod: GroupByPeriod;
  urls?: string[];
  showTest?: boolean;
  updateKey?: number;
}

export type OnChangeCallback = MetricOptionsState;
