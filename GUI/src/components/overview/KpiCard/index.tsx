import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Card from '../../Card';
import Track from '../../Track';
import KpiValue from '../KpiValue';
import { KpiFormat } from '../kpiFormat';
import './styles.scss';

type Props = {
  readonly titleKey: string;
  readonly value: number;
  readonly previousValue: number;
  readonly format: KpiFormat;
  readonly periodLabelKey: string;
  readonly highlighted?: boolean;
};

const KpiCard = ({ titleKey, value, previousValue, format, periodLabelKey, highlighted }: Props) => {
  const { t } = useTranslation();

  return (
    <div className={clsx('kpi-card', { 'kpi-card--highlighted': highlighted })}>
      <Card>
        <Track className="kpi-card__title">{t(titleKey)}</Track>
        <KpiValue value={value} previousValue={previousValue} format={format} periodLabelKey={periodLabelKey} highlighted={highlighted} />
      </Card>
    </div>
  );
};

export default KpiCard;
