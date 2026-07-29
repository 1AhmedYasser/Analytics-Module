import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md';
import clsx from 'clsx';
import Icon from '../../Icon';
import Track from '../../Track';
import { formatKpiValue, KpiFormat } from '../kpiFormat';
import './styles.scss';

type Props = {
  readonly value: number;
  readonly previousValue: number;
  readonly format: KpiFormat;
  readonly periodLabelKey: string;
  readonly highlighted?: boolean;
};

const KpiValue = ({ value, previousValue, format, periodLabelKey, highlighted }: Props) => {
  const { t } = useTranslation();
  const hasPrevious = previousValue !== 0 || value !== 0;

  const getPercentChange = (): number => {
    if (previousValue !== 0) {
      return Math.round(((value - previousValue) / previousValue) * 100);
    }
    return value !== 0 ? 100 : 0;
  };
  const percentChange = getPercentChange();
  const isUp = percentChange >= 0;
  const trendClass = isUp ? 'kpi-value__trend--up' : 'kpi-value__trend--down';

  return (
    <>
      <h2 className="kpi-value__value">{formatKpiValue(value, format)}</h2>
      <Track gap={4} className="kpi-value__footer">
        {hasPrevious && (
          <Track gap={2} className={clsx('kpi-value__trend', trendClass)}>
            <Icon icon={isUp ? <MdArrowUpward /> : <MdArrowDownward />} size="small" />
            <span>{Math.abs(percentChange)}%</span>
          </Track>
        )}
        <Track
          gap={4}
          className={clsx(highlighted && hasPrevious && trendClass)}
        >
          <span className="kpi-value__dot">·</span>
          <span className="kpi-value__period">{t(periodLabelKey)}</span>
          <span className="kpi-value__previous">{formatKpiValue(previousValue, format)}</span>
        </Track>
      </Track>
    </>
  );
};

export default KpiValue;
