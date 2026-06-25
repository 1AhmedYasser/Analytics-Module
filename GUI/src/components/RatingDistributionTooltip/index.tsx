import { useTranslation } from 'react-i18next';

type RatingDistributionDatum = {
  readonly rating: number | string;
  readonly count: number;
};

type Props = {
  payload?: Array<{ payload?: RatingDistributionDatum }>;
};

const RatingDistributionTooltip = ({ payload }: Props) => {
  const { t } = useTranslation();
  const tooltipPayload = payload ?? [];

  if (!tooltipPayload.length) {
    return null;
  }

  const p = tooltipPayload[0]?.payload;

  if (p?.count == null) {
    return null;
  }

  return (
    <div style={{ padding: 8, background: '#fff', border: '1px solid #ccc' }}>
      {String(t('chart.rating'))}: {String(p.rating)} - {String(t('chart.count'))}: {p.count}
    </div>
  );
};

export default RatingDistributionTooltip;
