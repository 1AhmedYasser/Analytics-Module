export type KpiFormat = 'number' | 'percent' | 'seconds' | 'rating';

export const formatKpiValue = (value: number, format: KpiFormat): string => {
  switch (format) {
    case 'percent':
      return `${Math.round(value)}%`;
    case 'seconds':
      return value < 60 ? `${Math.round(value)} s` : `${Math.round(value / 60)} min`;
    case 'rating':
      return value.toFixed(2);
    default:
      return `${Math.round(value)}`;
  }
};
