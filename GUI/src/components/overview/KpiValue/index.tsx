import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md';
import clsx from 'clsx';
import Icon from '../../Icon';
import Track from '../../Track';
import { formatKpiValue, KpiFormat } from '../kpiFormat';
import './styles.scss';

type Props = {
  value: number;
  previousValue: number;
  format: KpiFormat;
  periodLabelKey: string;
};

const KpiValue = ({ value, previousValue, format, periodLabelKey }: Props) => {
  const { t } = useTranslation();
  const hasPrevious = previousValue !== 0;
  const percentChange = hasPrevious ? Math.round(((value - previousValue) / previousValue) * 100) : 0;
  const isUp = percentChange >= 0;

  return (
    <>
      <h2 className="kpi-value__value">{formatKpiValue(value, format)}</h2>
      <Track gap={4} className="kpi-value__footer">
        {hasPrevious && (
          <Track gap={2} className={clsx('kpi-value__trend', isUp ? 'kpi-value__trend--up' : 'kpi-value__trend--down')}>
            <Icon icon={isUp ? <MdArrowUpward /> : <MdArrowDownward />} size="small" />
            <span>{Math.abs(percentChange)}%</span>
          </Track>
        )}
        <span className="kpi-value__dot">·</span>
        <span className="kpi-value__period">{t(periodLabelKey)}</span>
        <span className="kpi-value__previous">{formatKpiValue(previousValue, format)}</span>
      </Track>
    </>
  );
};

export default KpiValue;
