import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../../Card';
import Track from '../../Track';
import KpiValue from '../KpiValue';
import { KpiFormat } from '../kpiFormat';
import './styles.scss';

type Props = {
  titleKey: string;
  value: number;
  previousValue: number;
  format: KpiFormat;
  periodLabelKey: string;
};

const KpiCard = ({ titleKey, value, previousValue, format, periodLabelKey }: Props) => {
  const { t } = useTranslation();

  return (
    <Card>
      <Track className="kpi-card__title">{t(titleKey)}</Track>
      <KpiValue value={value} previousValue={previousValue} format={format} periodLabelKey={periodLabelKey} />
    </Card>
  );
};

export default KpiCard;
