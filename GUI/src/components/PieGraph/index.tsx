import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PieChart, Cell, Pie, Tooltip } from 'recharts';
import { getColor } from '../../util/charts-utils';
import ChartToolTip from '../ChartToolTip';
import PercentageToolTip from '../PercentageToolTip';
import Track from '../Track';
import { calculatePercentagesFromResponse } from '../../util/percentage';
import PieCharLegends from './PieCharLegends';
import { useTranslation } from 'react-i18next';
import './PieGraph.scss';
import { ChartData } from 'types/chart';

type Props = {
  data: ChartData;
  isRatingDistribution?: boolean;
};

const PieGraph = ({ data, isRatingDistribution }: Props) => {
  const [width, setWidth] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const percentages = useMemo(() => {
    const chartData = data?.chartData ?? [];
    if (isRatingDistribution && chartData.length > 0 && ('rating' in chartData[0] || 'count' in chartData[0])) {
      const typed = chartData as { rating: number | string; count: number }[];
      const total = typed.reduce((s, d) => s + d.count, 0);
      return typed.map((d) => ({
        name: String(d.rating),
        value: total === 0 ? 0 : Math.round((d.count / total) * 1000) / 10,
      }));
    }
    return calculatePercentagesFromResponse(
      chartData.map(obj =>
        Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, typeof v === 'number' ? v : Number(v)])
        )
      ) as Record<string, number>[]
    );
  }, [data?.chartData, isRatingDistribution]);

  useEffect(() => {
    const handleResize = () => {
      setWidth(ref.current?.clientWidth ?? 0);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={ref}>
      <Track>
        <PieChart
          width={(width ?? 0) / 2}
          height={(width ?? 0) / 3.76}
          data={data.chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <Pie
            data={percentages}
            cx="50%"
            cy="50%"
            outerRadius="100%"
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {percentages.map((e: any) => (
              <Cell
                key={`cell-${e['name']}`}
                type="monotone"
                stroke={getColor(data, e['name'])}
                fill={getColor(data, e['name'])}
              />
            ))}
          </Pie>
          <Tooltip content={percentages ? <PercentageToolTip /> : <ChartToolTip />} />
        </PieChart>
        {percentages.length === 0 && <span>{t('chart.noDataToPlot')}</span>}
        <PieCharLegends
          data={data}
          percentages={percentages}
        />
      </Track>
    </div>
  );
};

export default PieGraph;
