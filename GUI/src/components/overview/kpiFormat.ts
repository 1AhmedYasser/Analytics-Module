export type KpiFormat = 'number' | 'percent' | 'seconds' | 'rating';

const floorToOneDecimal = (value: number): string => (Math.floor(value * 10) / 10).toFixed(1);

export const formatKpiValue = (value: number, format: KpiFormat): string => {
  switch (format) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'seconds':
      return `${Math.round(value)} s`;
    case 'rating':
      return floorToOneDecimal(value);
    default:
      return `${Math.round(value)}`;
  }
};
