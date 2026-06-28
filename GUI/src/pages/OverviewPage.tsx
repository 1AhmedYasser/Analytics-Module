import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdEdit } from 'react-icons/md';
import { Button, Card, Icon, Track } from '../components';
import OverviewDateControl from '../components/overview/OverviewDateControl';
import OverviewEditModal from '../components/overview/OverviewEditModal';
import KpiCardsGrid from '../components/overview/KpiCardsGrid';
import OverviewBarChart from '../components/overview/OverviewBarChart';
import PositiveFeedbackCard from '../components/overview/PositiveFeedbackCard';
import ResponseQualityCard from '../components/overview/ResponseQualityCard';
import ThemesCard from '../components/overview/ThemesCard';
import FollowUpCard from '../components/overview/FollowUpCard';
import { overviewMetricPreferences } from '../resources/api-constants';
import { OverviewMetricPreference } from '../types/overview-metrics';
import { formatDate } from '../util/charts-utils';
import { request, Methods } from '../util/axios-client';
import withAuthorization, { ROLES } from '../hoc/with-authorization';
import { getRange, getPreviousRange, OverviewUnit } from '../util/overview-date-utils';
import './OverviewPage.scss';

const OverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const [metricPreferences, setMetricPreferences] = useState<OverviewMetricPreference[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [unit, setUnit] = useState<OverviewUnit>('week');
  const [anchorDate, setAnchorDate] = useState(new Date());

  const range = useMemo(() => getRange(unit, anchorDate), [unit, anchorDate]);
  const previousRange = useMemo(() => getPreviousRange(unit, anchorDate), [unit, anchorDate]);

  useEffect(() => {
    fetchMetricPreferences().catch(console.error);
  }, []);

  const fetchMetricPreferences = async () => {
    const result: any = await request({ url: overviewMetricPreferences(), withCredentials: true });
    setMetricPreferences(result.response ?? []);
  };

  const saveMetricPreferences = async (preferences: OverviewMetricPreference[]) => {
    setMetricPreferences(preferences);
    await request({
      url: overviewMetricPreferences(),
      method: Methods.post,
      withCredentials: true,
      data: { preferences: JSON.stringify(preferences) },
    });
  };

  const isActive = (metric: string): boolean => {
    const preference = metricPreferences.find((p) => p.metric === metric);
    return preference ? preference.active : true;
  };

  const chartRangeLabel = `${formatDate(range.start, 'dd.MM.yyyy')} - ${formatDate(range.end, 'dd.MM.yyyy')}`;

  return (
    <><h1>{t('menu.overview')}</h1>
    <Card>
      <Track justify="between">
          <Button appearance="text" onClick={() => setIsEditing(true)}>
            <Icon icon={<MdEdit />} size="medium" />
            {t('overview.edit')}
          </Button>
          <OverviewDateControl
            unit={unit}
            anchorDate={anchorDate}
            range={range}
            onUnitChange={setUnit}
            onAnchorChange={setAnchorDate}
          />
        <Button appearance="secondary" size="s" onClick={() => setAnchorDate(new Date())}>
          {t('global.today')}
        </Button>
      </Track>

      {isEditing && (
        <OverviewEditModal
          preferences={metricPreferences}
          onClose={() => setIsEditing(false)}
          onConfirm={(preferences) => {
            saveMetricPreferences(preferences).catch(console.error);
            setIsEditing(false);
          }}
        />
      )}

      <KpiCardsGrid unit={unit} range={range} previousRange={previousRange} isActive={isActive} />

      {isActive('chart') && (
        <Card
          header={
            <Track>
              <h3>{t('overview.totalChatsChart', { range: chartRangeLabel })}</h3>
            </Track>
          }
        >
          <OverviewBarChart range={range} unit={unit} />
        </Card>
      )}

      <div className="overview-secondary-grid">
        {isActive('positive_feedback') && <PositiveFeedbackCard range={range} previousRange={previousRange} unit={unit} />}
        {isActive('quality') && <ResponseQualityCard range={range} />}
        {isActive('themes') && <ThemesCard range={range} />}
        {isActive('follow_up') && <FollowUpCard range={range} />}
      </div>
    </Card></>
  );
};

export default withAuthorization(OverviewPage, [ROLES.ROLE_ADMINISTRATOR, ROLES.ROLE_ANALYST]);
