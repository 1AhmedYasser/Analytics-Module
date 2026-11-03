import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { MdOutlineInfo } from 'react-icons/md';
import Card from '../../Card';
import Track from '../../Track';
import Tooltip from '../../Tooltip';
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
  readonly tooltipKey?: string;
  readonly notAvailable?: boolean;
};

const KpiCard = ({ titleKey, value, previousValue, format, periodLabelKey, highlighted, tooltipKey, notAvailable }: Props) => {
  const { t } = useTranslation();

  return (
    <div className={clsx('kpi-card', { 'kpi-card--highlighted': highlighted })}>
      <Card>
        <Track gap={8} justify="between" className="kpi-card__title">
          <span className="kpi-card__label">{t(titleKey)}</span>
          {tooltipKey && (
            <Tooltip content={<span className="kpi-card__tooltip">{t(tooltipKey)}</span>}>
              <span className="kpi-card__info">
                <MdOutlineInfo />
              </span>
            </Tooltip>
          )}
        </Track>
        <KpiValue
          value={value}
          previousValue={previousValue}
          format={format}
          periodLabelKey={periodLabelKey}
          highlighted={highlighted}
          notAvailable={notAvailable}
        />
      </Card>
    </div>
  );
};

export default KpiCard;
