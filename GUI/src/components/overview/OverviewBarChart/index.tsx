import React, { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatDate, getDistributionYAxisTicks } from '../../../util/charts-utils';
import { DateRange, formatOverviewChartTitleRange, OverviewUnit } from '../../../util/overview-date-utils';
import { OVERVIEW_AXIS_STROKE, OVERVIEW_BLUE, OVERVIEW_GREEN, OVERVIEW_TICK_FILL } from '../../../util/overview-colors';
import { createStackedBarShape } from './barShapes';
import { useOverviewChartData } from './useOverviewChartData';
import './styles.scss';

const LEGEND_ITEMS = [
  { key: 'overview.legend.burokratt', color: OVERVIEW_BLUE },
  { key: 'overview.legend.csa', color: OVERVIEW_GREEN },
] as const;

const roundUpToTen = (value: number): number => (value <= 10 ? 10 : Math.ceil(value / 10) * 10);

type Props = {
  readonly range: DateRange;
  readonly unit: OverviewUnit;
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

  const maxTotal = Math.max(0, ...buckets.map((b) => b.burokratt + b.csa));
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
        <CartesianGrid
          vertical={false}
          horizontalValues={yAxisTicks.filter((tick) => tick > 0)}
          stroke={OVERVIEW_AXIS_STROKE}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="bucket"
          tickFormatter={tickFormatter}
          type="number"
          domain={['dataMin', 'dataMax']}
          scale="time"
          padding={{ left: unit === 'day' ? 8 : 14, right: unit === 'day' ? 8 : 14 }}
          axisLine={{ stroke: OVERVIEW_AXIS_STROKE }}
          tickLine={false}
          tick={{ fill: OVERVIEW_TICK_FILL, fontSize: 12 }}
        />
        <YAxis
          domain={[0, yAxisMax]}
          ticks={yAxisTicks}
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: OVERVIEW_TICK_FILL, fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(151, 153, 164, 0.12)' }}
          labelFormatter={(value) => formatDate(new Date(value as number), unit === 'day' ? 'HH:mm' : 'dd-MM-yyyy')}
        />
        <Bar dataKey="burokratt" stackId="total" fill={OVERVIEW_BLUE} shape={createStackedBarShape('burokratt')} />
        <Bar dataKey="csa" stackId="total" fill={OVERVIEW_GREEN} shape={createStackedBarShape('csa')}>
          <LabelList
            position="top"
            content={({ x, y, width: barWidth, index }) => {
              if (index === undefined) return null;
              const bucket = buckets[index as number];
              if (!bucket) return null;
              const total = bucket.burokratt + bucket.csa;
              const centerX = Number(x) + Number(barWidth) / 2;
              return (
                <g>
                  {total > 0 && (
                    <text x={centerX} y={Number(y) - 6} textAnchor="middle" fontSize={12} fontWeight={600}>
                      {total}
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
