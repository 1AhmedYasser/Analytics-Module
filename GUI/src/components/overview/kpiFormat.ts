export type KpiFormat = 'number' | 'percent' | 'seconds' | 'rating';

const floorToOneDecimal = (value: number): string => (Math.floor(value * 10) / 10).toFixed(1);

export const formatKpiValue = (value: number, format: KpiFormat): string => {
  switch (format) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'seconds':
      return value < 60 ? `${Math.round(value)} s` : `${Math.round(value / 60)} min`;
    case 'rating':
      return floorToOneDecimal(value);
    default:
      return `${Math.round(value)}`;
  }
};
