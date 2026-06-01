import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { MdOutlineDownload, MdOutlineInfo } from 'react-icons/md';
import Tooltip from '../Tooltip';
import { Button, Card, FormSelect, Icon } from '../../components';
import BarGraph from '../BarGraph';
import './MetricsCharts.scss';
import LineGraph from '../LineGraph';
import PieGraph from '../PieGraph';
import { getXlsx } from '../../resources/api-constants';
import { ChartData, ChartType } from '../../types/chart';
import { chartDataKey, formatDate, formatTimestamp, getKeys } from '../../util/charts-utils';
import { GroupByPeriod } from '../MetricAndPeriodOptions/types';
import { request, Methods } from '../../util/axios-client';
import { saveFile } from 'util/file';

type Props = {
  title: any;
  data: ChartData;
  startDate: string;
  endDate: string;
  unit?: string;
  groupByPeriod: GroupByPeriod;
};

const formatPeriodScore = (value: number | undefined | null): string => {
  if (value == null || Number.isNaN(value)) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
};

const getCountForRatings = (chartData: { rating: number; count: number }[], ratings: number[]): number =>
  chartData.filter(({ rating }) => ratings.includes(rating)).reduce((s, { count }) => s + count, 0);

const calcPct = (numerator: number, denominator: number): string => {
  if (!denominator) return '—';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
};

const MetricsCharts = ({ title, data, startDate, endDate, unit, groupByPeriod }: Props) => {
  const { t } = useTranslation();
  const formattedStartDate = formatDate(new Date(startDate), 'yyyy-MM-dd');
  const formattedEndDate = formatDate(new Date(endDate), 'yyyy-MM-dd');
  const isFiveScale = data.distributionData?.isFiveScale ?? false;
  const feedbackScoreLabel = isFiveScale ? t('feedback.positiveFeedbackScore') : t('feedback.averageNps');

  const distributionChartData = (data.distributionData?.chartData ?? []) as { rating: number; count: number }[];
  const totalFeedback = data.distributionData?.totalFeedback ?? 0;

  const averageFeedbackRating =
    totalFeedback > 0
      ? (distributionChartData.reduce((sum, { rating, count }) => sum + rating * count, 0) / totalFeedback).toFixed(2)
      : '—';

  const satisfiedCount = isFiveScale
    ? getCountForRatings(distributionChartData, [4, 5])
    : getCountForRatings(distributionChartData, [9, 10]);
  const passiveCount = isFiveScale
    ? getCountForRatings(distributionChartData, [3])
    : getCountForRatings(distributionChartData, [7, 8]);
  const dissatisfiedCount = isFiveScale
    ? getCountForRatings(distributionChartData, [1, 2])
    : getCountForRatings(distributionChartData, [0, 1, 2, 3, 4, 5, 6]);

  const satisfiedPct = calcPct(satisfiedCount, totalFeedback);
  const passivePct = calcPct(passiveCount, totalFeedback);
  const dissatisfiedPct = calcPct(dissatisfiedCount, totalFeedback);

  const charts: ChartType[] = [
    {
      label: t('chart.barChart'),
      value: 'barChart',
    },
    {
      label: t('chart.pieChart'),
      value: 'pieChart',
    },
    {
      label: t('chart.lineChart'),
      value: 'lineChart',
    },
  ];
  const [selectedChart, setSelectedChart] = useState<string>('barChart');
  const isRatingDistribution = data.distributionData?.isRatingDistribution === true;
  const distributionOrFeedBack = selectedChart === 'pieChart' ? (data.distributionData ?? data) : (data.feedBackData ?? data);
  const selectedData = isRatingDistribution ? (data.distributionData ?? data) : distributionOrFeedBack;

  const buildChart = () => {
    if (selectedChart === 'pieChart') {
      return <PieGraph data={selectedData} isRatingDistribution={isRatingDistribution} />;
    } else if (selectedChart === 'lineChart') {
      return (
        <LineGraph
          data={selectedData}
          startDate={formattedStartDate}
          endDate={formattedEndDate}
          unit={unit}
          isRatingDistribution={isRatingDistribution}
        />
      );
    } else {
      return (
        <BarGraph
          data={selectedData}
          startDate={formattedStartDate}
          endDate={formattedEndDate}
          unit={unit}
          groupByPeriod={groupByPeriod}
          isRatingDistribution={isRatingDistribution}
        />
      );
    }
  };

  const downloadXlsx = async (data: any[] = []) => {
    const modifiedData: any[] = data?.map((item) => {
      const modifiedItem: any = { ...item };
      getKeys(data).forEach((propertyName: any) => {
        if (!(propertyName in modifiedItem)) {
          modifiedItem[propertyName] = 0;
        }
      });
      return modifiedItem;
    });

    const res = await request<
      {
        data: unknown[];
      },
      {
        base64String: string;
      }
    >({
      url: getXlsx(),
      method: Methods.post,
      withCredentials: true,
      data: {
        data: modifiedData?.map((p) => {
          const { [chartDataKey]: originalKey, ...rest } = p;
          return {
            [t(`global.${chartDataKey}`)]: formatTimestamp(originalKey),
            ...rest,
          };
        }),
      },
    });

    await saveFile(
      res.base64String,
      'metrics.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  };

  return (
    <Card
      header={
        <div className="container">
          <div className="title">
            <h3>
              {t(title)}{' '}
              {formattedStartDate === formattedEndDate
                ? formatTimestamp(formattedStartDate)
                : `${formatTimestamp(formattedStartDate)} - ${formatTimestamp(formattedEndDate)}`}
            </h3>
          </div>
          <div className="other_content">
            <Button
              appearance="text"
              style={{ marginRight: 15 }}
              onClick={() => {
                let sourceData = data.chartData;
                if (data.distributionData?.isRatingDistribution) {
                  sourceData = data.distributionData?.chartData ?? data.chartData;
                } else if (data.feedBackData?.chartData) {
                  sourceData = data.feedBackData.chartData;
                }
                downloadXlsx(sourceData);
              }}
            >
              <Icon
                icon={<MdOutlineDownload />}
                size="small"
              />
              {t('feedback.xlsx')}
            </Button>
            <FormSelect
              name={''}
              label={''}
              defaultValue={'barChart'}
              options={charts}
              onSelectionChange={(value) => setSelectedChart(value?.value ?? 'barChart')}
            />
          </div>
        </div>
      }
    >
      <div className="charts_wrapper">
        {buildChart()}
      </div>
      {isRatingDistribution && (data.distributionData?.totalChats != null || data.distributionData?.totalFeedback != null) && (
        <div className="feedback_summary" style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid #eee' }}>
          <div style={{ marginBottom: 4 }}>
            <span>
              {feedbackScoreLabel}: {formatPeriodScore(data.feedBackData?.periodNps ?? data.periodNps)}
            </span>
          </div>
          <div style={{ marginBottom: 4 }}>
            {t('feedback.percentOfChatsWithFeedback')}:{' '}
            {data.distributionData?.totalChats != null && data.distributionData.totalChats > 0
              ? `${((data.distributionData.totalFeedback ?? 0) / data.distributionData.totalChats * 100).toFixed(1)}%`
              : '0%'}
          </div>
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip content={<span style={{ maxWidth: 320, display: 'inline-block' }}>{t('feedback.tooltip_averageFeedbackRating')}</span>}>
              <span style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                {t('feedback.averageFeedbackRating')} <MdOutlineInfo />
              </span>
            </Tooltip>
            : {averageFeedbackRating}
          </div>
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip content={<span style={{ maxWidth: 320, display: 'inline-block' }}>{t('feedback.tooltip_satisfied')}</span>}>
              <span style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                {t('feedback.satisfied')} <MdOutlineInfo />
              </span>
            </Tooltip>
            : {satisfiedPct}
          </div>
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip content={<span style={{ maxWidth: 320, display: 'inline-block' }}>{t('feedback.tooltip_passive')}</span>}>
              <span style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                {t('feedback.passive')} <MdOutlineInfo />
              </span>
            </Tooltip>
            : {passivePct}
          </div>
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip content={<span style={{ maxWidth: 320, display: 'inline-block' }}>{t('feedback.tooltip_dissatisfied')}</span>}>
              <span style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                {t('feedback.dissatisfied')} <MdOutlineInfo />
              </span>
            </Tooltip>
            : {dissatisfiedPct}
          </div>
          <div>
            {t('feedback.chatsWithNoFeedback')}: {data.distributionData?.noFeedbackCount ?? (data.distributionData?.totalChats != null && data.distributionData?.totalFeedback != null ? data.distributionData.totalChats - data.distributionData.totalFeedback : '—')}
          </div>
        </div>
      )}
    </Card>
  );
};

export default MetricsCharts;
