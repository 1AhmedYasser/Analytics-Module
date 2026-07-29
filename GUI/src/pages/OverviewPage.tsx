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
import { overviewMetricPreferences, overviewDatePreference, overviewDatePreferenceUnit } from '../resources/api-constants';
import { OverviewDatePreferenceResponse, OverviewMetricPreference, OverviewSectionMetric } from '../types/overview-metrics';
import { request, Methods } from '../util/axios-client';
import withAuthorization, { ROLES } from '../hoc/with-authorization';
import {
  DateRange,
  getPreviousPeriodRange,
  getPreviousRange,
  getRange,
  OverviewUnit,
} from '../util/overview-date-utils';
import useStore from '../store/user/store';
import './OverviewPage.scss';

const todayLabelKey = (unit: OverviewUnit): string => {
  switch (unit) {
    case 'week':
      return 'overview.thisWeek';
    case 'month':
      return 'overview.thisMonth';
    default:
      return 'overview.thisDay';
  }
};

const OverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const [metricPreferences, setMetricPreferences] = useState<OverviewMetricPreference[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [unit, setUnit] = useState<OverviewUnit>('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [periodRange, setPeriodRange] = useState<DateRange>(() => getRange('month', new Date()));
  const [hydrated, setHydrated] = useState(false);
  const userDomains = useStore((state) => state.userDomains);

  const range = useMemo(
    () => (unit === 'period' ? periodRange : getRange(unit, anchorDate)),
    [unit, anchorDate, periodRange]
  );
  const previousRange = useMemo(
    () => (unit === 'period' ? getPreviousPeriodRange(range) : getPreviousRange(unit, anchorDate)),
    [unit, anchorDate, range]
  );

  useEffect(() => {
    fetchMetricPreferences().catch(console.error);
    fetchDatePreference().catch(console.error);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDatePreference().catch(console.error);
  }, [unit, hydrated]);

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

  const fetchDatePreference = async () => {
    const result = await request<undefined, OverviewDatePreferenceResponse>({
      url: overviewDatePreferenceUnit(),
      withCredentials: true,
    });
    const rows = result.response ?? [];
    const preference = rows[0];

    if (preference) {
      setUnit(preference.unit as OverviewUnit);
    }
    setHydrated(true);
  };

  const saveDatePreference = async () => {
    await request({
      url: overviewDatePreference(),
      method: Methods.post,
      withCredentials: true,
      data: { unit },
    });
  };

  const handleUnitChange = (newUnit: OverviewUnit) => {
    if (newUnit === 'period' && unit !== 'period') {
      setPeriodRange(range);
    }
    setUnit(newUnit);
  };

  const handleTodayClick = () => {
    if (unit === 'period') {
      setUnit('day');
    }
    setAnchorDate(new Date());
  };

  const isActive = (metric: OverviewSectionMetric): boolean => {
    const preference = metricPreferences.find((p) => p.metric === metric);
    return preference ? preference.active : true;
  };

  return (
    <>
      <h1>{t('menu.overview')}</h1>
      <div className="overview-page">
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
              periodRange={periodRange}
              onUnitChange={handleUnitChange}
              onAnchorChange={setAnchorDate}
              onPeriodRangeChange={setPeriodRange}
            />
            <Button appearance="secondary" size="s" onClick={handleTodayClick}>
              {t(todayLabelKey(unit))}
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

          <div className="overview-page__sections" key={userDomains.join(',')}>
            <KpiCardsGrid unit={unit} range={range} previousRange={previousRange} isActive={isActive} />

            {isActive('chart') && (
              <Card>
                <OverviewBarChart range={range} unit={unit} />
              </Card>
            )}

            <div className="overview-secondary-grid">
              {isActive('positive_feedback') && <PositiveFeedbackCard range={range} previousRange={previousRange} unit={unit} />}
              {isActive('quality') && <ResponseQualityCard range={range} />}
              {isActive('themes') && <ThemesCard range={range} />}
              {isActive('follow_up') && <FollowUpCard range={range} />}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default withAuthorization(OverviewPage, [ROLES.ROLE_ADMINISTRATOR, ROLES.ROLE_ANALYST]);
