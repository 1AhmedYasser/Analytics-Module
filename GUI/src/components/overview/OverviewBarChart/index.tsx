import React, { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Label, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatDate, getDistributionYAxisTicks } from '../../../util/charts-utils';
import { DateRange, formatOverviewChartTitleRange, OverviewUnit } from '../../../util/overview-date-utils';
import { useOverviewChartData } from './useOverviewChartData';
import './styles.scss';

const BLUE = '#3D6FA8';
const GREEN = '#3E9142';
const RED = '#B72727';

const LEGEND_ITEMS = [
  { key: 'overview.legend.burokratt', color: BLUE },
  { key: 'overview.legend.csa', color: GREEN },
  { key: 'overview.legend.leftWithoutAnswer', color: RED },
] as const;

const roundUpToTen = (value: number): number => (value <= 10 ? 10 : Math.ceil(value / 10) * 10);

type Props = {
  range: DateRange;
  unit: OverviewUnit;
};

const OverviewBarChart = ({ range, unit }: Props) => {
  const { t } = useTranslation();
  const buckets = useOverviewChartData(range, unit);
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => setWidth(ref.current?.clientWidth ?? 0);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxTotal = Math.max(0, ...buckets.map((b) => b.burokratt + b.csa + b.leftWithoutAnswer));
  const yAxisMax = roundUpToTen(maxTotal);
  const yAxisTicks = getDistributionYAxisTicks(yAxisMax);

  const tickFormatter = (value: number) => formatDate(new Date(value), unit === 'day' ? 'HH:mm' : 'dd.MM');

  const title = t('overview.totalChatsChartTitle', {
    unit: t(`overview.${unit}`),
    range: formatOverviewChartTitleRange(range, unit),
  });

  return (
    <div ref={ref} className="overview-bar-chart">
      <div className="overview-bar-chart__header">
        <h2 className="overview-bar-chart__title">{title}</h2>
        <div className="overview-bar-chart__legend">
          {LEGEND_ITEMS.map(({ key, color }) => (
            <div key={key} className="overview-bar-chart__legend-item">
              <span className="overview-bar-chart__legend-icon" style={{ backgroundColor: color }} />
              <span className="overview-bar-chart__legend-label">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
      <BarChart width={width} height={width / 3.76} data={buckets} barSize={unit === 'day' ? 8 : 20} margin={{ top: 20, right: 20, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="bucket"
          tickFormatter={tickFormatter}
          type="number"
          domain={['dataMin', 'dataMax']}
          scale="time"
          padding={{ left: unit === 'day' ? 8 : 14, right: unit === 'day' ? 8 : 14 }}
        />
        <YAxis domain={[0, yAxisMax]} ticks={yAxisTicks} allowDecimals={false}>
          <Label dx={-25} angle={270} value={String(t('chart.count'))} />
        </YAxis>
        <Tooltip labelFormatter={(value) => formatDate(new Date(value as number), unit === 'day' ? 'HH:mm' : 'dd-MM-yyyy')} />
        <Bar dataKey="burokratt" stackId="total" fill={BLUE} />
        <Bar dataKey="csa" stackId="total" fill={GREEN} />
        <Bar dataKey="leftWithoutAnswer" stackId="total" fill={RED}>
          <LabelList
            position="top"
            content={({ x, y, width: barWidth, index }) => {
              if (index === undefined) return null;
              const bucket = buckets[index as number];
              if (!bucket) return null;
              const total = bucket.burokratt + bucket.csa + bucket.leftWithoutAnswer;
              const centerX = Number(x) + Number(barWidth) / 2;
              return (
                <g>
                  {total > 0 && (
                    <text x={centerX} y={Number(y) - 6} textAnchor="middle" fontSize={12} fontWeight={600}>
                      {total}
                    </text>
                  )}
                  {bucket.leftWithoutAnswer > 0 && (
                    <text x={centerX + 14} y={Number(y) - 6} textAnchor="start" fontSize={10} fill={RED}>
                      {`-${bucket.leftWithoutAnswer}`}
                    </text>
                  )}
                </g>
              );
            }}
          />
        </Bar>
      </BarChart>
    </div>
  );
};

export default OverviewBarChart;
