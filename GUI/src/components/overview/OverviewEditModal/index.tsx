import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../Button';
import Dialog from '../../Dialog';
import { FormCheckbox } from '../../FormElements';
import { OverviewMetricPreference } from '../../../types/overview-metrics';
import './styles.scss';

export const OVERVIEW_SECTION_METRICS = [
  'total_chats',
  'avg_waiting_time',
  'avg_rating',
  'burokratt_rate',
  'csa_rate',
  'redirected_rate',
  'left_without_answer_rate',
  'chart',
  'positive_feedback',
  'quality',
  'themes',
  'follow_up',
] as const;

type Props = {
  preferences: OverviewMetricPreference[];
  onClose: () => void;
  onConfirm: (preferences: OverviewMetricPreference[]) => void;
};

const OverviewEditModal = ({ preferences, onClose, onConfirm }: Props) => {
  const { t } = useTranslation();
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const toggle = (metric: string) => {
    setLocalPreferences((prev) => prev.map((p) => (p.metric === metric ? { ...p, active: !p.active } : p)));
  };

  const rows = OVERVIEW_SECTION_METRICS.map((metric) => localPreferences.find((p) => p.metric === metric)).filter(
    (p): p is OverviewMetricPreference => !!p
  );

  return (
    <Dialog
      title={t('overview.editView')}
      onClose={onClose}
      footer={
        <>
          <Button appearance="secondary" onClick={onClose}>
            {t('global.cancel')}
          </Button>
          <Button appearance="error" onClick={() => onConfirm(localPreferences)}>
            {t('overview.confirmEdit')}
          </Button>
        </>
      }
    >
      <p className="overview-edit-modal__description">{t('overview.editDescription')}</p>
      <div className="overview-edit-modal__list">
        {rows.map((row) => (
          <FormCheckbox
            key={row.metric}
            item={{ label: t(`overview.metric.${row.metric}`), value: row.metric }}
            checked={row.active}
            onChange={() => toggle(row.metric)}
          />
        ))}
      </div>
    </Dialog>
  );
};

export default OverviewEditModal;
