import React, { useEffect, useRef, useState } from 'react';
import { BarChart, CartesianGrid, YAxis, Tooltip, Legend, Bar, Label, XAxis, LabelList } from 'recharts';
import {
  chartDataKey,
  dateFormatter,
  formatDate,
  formatTotalPeriodCount,
  getColor,
  getDistributionYAxisTicks,
  getKeys,
  getTicks,
} from '../../util/charts-utils';
import { GroupByPeriod } from '../MetricAndPeriodOptions/types';
import { useTranslation } from 'react-i18next';
import { ChartData } from 'types/chart';
import { usePeriodStatisticsContext } from 'hooks/usePeriodStatisticsContext';
import { CustomChartTooltip, RatingDistributionTooltip } from 'components';

type Props = {
  data: ChartData;
  startDate: string;
  endDate: string;
  unit?: string;
  groupByPeriod: GroupByPeriod;
  isRatingDistribution?: boolean;
};

const BarGraph: React.FC<Props> = ({ startDate, endDate, data, unit, groupByPeriod, isRatingDistribution }) => {
  const [width, setWidth] = useState<number | null>(null);
  const { periodStatistics } = usePeriodStatisticsContext();

  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleResize = () => {
      setWidth(ref.current?.clientWidth ?? 0);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  let minDate = new Date(startDate).getTime();
  if (groupByPeriod === 'day') {
    const millisecondInOneDay = 24 * 60 * 60 * 1000;
    minDate = minDate - millisecondInOneDay;
  }

  const domain = [minDate, new Date(endDate).getTime()];
  const ticks = getTicks(startDate, endDate, new Date(startDate), new Date(endDate), 5);
  const ratingDistributionTicks = getDistributionYAxisTicks(data.yAxisMax ?? 10);

  if (isRatingDistribution && (data?.chartData?.length ?? 0) > 0 && data.chartData?.[0] && 'rating' in data.chartData[0]) {
    return (
      <div ref={ref}>
        <BarChart
          width={width ?? 0}
          height={(width ?? 0) / 3.76}
          data={data.chartData}
          barSize={20}
          margin={{ top: 20, right: 65, bottom: 50 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="rating" type="category" />
          <YAxis domain={[0, data.yAxisMax ?? 10]} ticks={ratingDistributionTicks} allowDataOverflow allowDecimals={false}>
            <Label dx={-25} angle={270} value={unit ?? String(t('chart.count'))} />
          </YAxis>
          <Tooltip content={<RatingDistributionTooltip />} />
          <Bar
            dataKey="count"
            type="monotone"
            fill={getColor(data, 'count') || '#8884d8'}
            stroke={getColor(data, 'count') || '#8884d8'}
          >
            <LabelList
              dataKey="count"
              position="top"
              formatter={(value: number) => (value > 0 ? value : '')}
            />
          </Bar>
        </BarChart>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <BarChart
        width={width ?? 0}
        height={(width ?? 0) / 3.76}
        data={data.chartData}
        barSize={20}
        margin={{ top: 20, right: 65, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={chartDataKey}
          scale="time"
          tickFormatter={(value) => dateFormatter(startDate, endDate, value)}
          type="number"
          domain={domain}
          ticks={ticks}
          angle={35}
          dx={30}
          dy={26}
          minTickGap={0}
          interval={0}
          padding={{ left: 25, right: 25 }}
        />
        <YAxis ticks={data.chartData && data.chartData.length > 0 ? undefined : [0]}>
          <Label
            dx={-25}
            angle={270}
            value={unit}
          />
        </YAxis>
        <Tooltip content={<CustomChartTooltip formatDate={(date) => formatDate(date, 'dd-MM-yyyy')} />} />
        <Legend
          wrapperStyle={{ position: 'relative', marginTop: '20px' }}
          formatter={(value) => `${value}${formatTotalPeriodCount(periodStatistics, value)}`}
        />
        {data?.chartData?.length > 0 &&
          getKeys(data.chartData).map((k, i) => {
            const isCount = k === t('chats.totalCount');
            const isString = typeof data.chartData[0][k] === 'string';
            return k === chartDataKey ? null : (
              <Bar
                key={k}
                dataKey={k}
                type="monotone"
                barSize={isString ? 0 : undefined}
                height={isString ? 0 : undefined}
                stackId={isCount || isString ? undefined : chartDataKey}
                stroke={getColor(data, k)}
                fill={getColor(data, k)}
                minPointSize={data?.minPointSize ?? undefined}
              />
            );
          })}
      </BarChart>
    </div>
  );
};

export default BarGraph;
