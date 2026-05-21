import React, { useCallback, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { MdEdit } from 'react-icons/md';
import { Button, Card, Drawer, Icon, Track } from '../components';
import DraggableListItem from '../components/overview/DraggableListItem';
import MainMetricsArea from '../components/overview/MainMetricsArea';
import LineGraph from '../components/LineGraph';
import { openSearchDashboard, overviewMetricPreferences, overviewMetrics } from '../resources/api-constants';
import { OverviewMetricPreference } from '../types/overview-metrics';
import { reorderItem } from '../util/reorder-array';
import { formatDate } from '../util/charts-utils';
import { request, Methods } from '../util/axios-client';
import withAuthorization, { ROLES } from '../hoc/with-authorization';
import { ChartData } from 'types/chart';
import useStore from "../store/user/store";
import {getDomainsArray} from "../util/multiDomain-utils";
import { getShowTestData } from 'util/testChat-utils';
import { endOfDay, formatISO, startOfDay } from 'date-fns';
const multiDomainsEnabled = import.meta.env.REACT_APP_ENABLE_MULTI_DOMAIN;

const OverviewPage: React.FC = () => {
  const [metricPreferences, setMetricPreferences] = useState<OverviewMetricPreference[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    chartData: [],
    colors: [],
  });
  const [drawerIsHidden, setDrawerIsHidden] = useState(true);
  const [updateKey, setUpdateKey] = useState<number>(0)
  const multiDomainEnabled = import.meta.env.REACT_APP_ENABLE_MULTI_DOMAIN?.toLowerCase() === 'true';


  useEffect(() => {
    if (!multiDomainEnabled) return;

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (
          JSON.stringify(state.userDomains) !==
          JSON.stringify(prevState.userDomains)
      ) {
        setUpdateKey((v) => v + 1);
      }
    });

    return () => unsubscribe();
  }, [multiDomainEnabled, useStore]);

  const { t } = useTranslation();

  useEffect(() => {
    fetchMetricPreferences().catch(console.error);
    fetchChartData().catch(console.error);

    const interval = setInterval(() => fetchChartData(), 30000);
    return () => clearInterval(interval);
  }, [updateKey]);

  const fetchMetricPreferences = async () => {
    const result: any = await request({ url: overviewMetricPreferences(), withCredentials: true });
    setMetricPreferences(result.response);
  };

  const fetchChartData = async () => {
    const result: any = await request({
      url: overviewMetrics(),
      withCredentials: true,
      method: Methods.post,
      data: {
        urls: multiDomainsEnabled?.toLowerCase() === 'true' ? getDomainsArray() : ['none'],
        showTest: getShowTestData(),
        metrics: 'chat-activity',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        startDate: formatISO(startOfDay(new Date())),
        endDate: formatISO(endOfDay(new Date())),
      },
    });

    const response = result.response['chat-activity'].map((entry: any) => ({
      ...translateChartKeys(entry),
      dateTime: new Date(entry.ended).getTime() + new Date(entry.ended).getTimezoneOffset() * 60 * 1000,
    }));

    const chartData = {
      chartData: response,
      colors: [
        { id: t('chart.metricValue'), color: '#89B5CB' },
        { id: t('chart.clientLeftWithAccepted'), color: '#B72727' },
        { id: t('chart.clientLeftWithNoResolution'), color: '#B4E282' },
        { id: t('chart.hateSpeech'), color: '#F2E041' },
        { id: t('chart.accepted'), color: '#13B005' },
        { id: t('chart.other'), color: '#9D0AB4' },
        { id: t('chart.responseSentToClientEmail'), color: '#320CBB' },
      ],
    };
    setChartData(chartData);
  };

  const updateMetricPreference = async (metrics: OverviewMetricPreference[]) => {
    await request({
      url: overviewMetricPreferences(),
      method: Methods.post,
      withCredentials: true,
      data: { preferences: JSON.stringify(metrics) },
    });
  };

  const toggleMetricActive = (metric: OverviewMetricPreference) => {
    const updatedMetrics = metricPreferences.map((m) => (m === metric ? { ...metric, active: !metric.active } : m));
    setMetricPreferences(updatedMetrics);
    updateMetricPreference(updatedMetrics);
  };

  const saveReorderedMetric = useCallback(
    (metric: OverviewMetricPreference, newIndex: number) => {
        const updatedMetrics = reorderItem<OverviewMetricPreference>(
            metricPreferences,
            (m) => m.metric === metric.metric,
            newIndex
        );

        updateMetricPreference(updatedMetrics);
    },
    [metricPreferences]
  );

  const moveMetric = (metric: string, target: number) => {
    setMetricPreferences((metrics) =>
      reorderItem<OverviewMetricPreference>(metrics, (m) => m.metric === metric, target)
    );
  };

  const translateChartKeys = (obj: any) =>
    Object.keys(obj).reduce(
      (acc, key) =>
        key === 'created' || key === 'ended'
          ? acc
          : {
              ...acc,
              ...{ [t(`chart.${key}`)]: obj[key] },
            },
      {}
    );

  const renderList = (m: OverviewMetricPreference, i: number) => (
    <DraggableListItem
      key={m.metric}
      metric={m}
      toggleMetricActive={toggleMetricActive}
      moveMetric={moveMetric}
      saveReorderedMetric={saveReorderedMetric}
      index={i}
    />
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <Track justify="between">
        <h1>{t('menu.overview')}</h1>
        <Button
          appearance="text"
          onClick={() => setDrawerIsHidden(false)}
        >
          <Icon
            icon={<MdEdit />}
            size="medium"
          />
          {t('overview.edit')}
        </Button>
      </Track>

      <Drawer
        onClose={() => setDrawerIsHidden(true)}
        title={t('overview.editView')}
        style={{ transform: drawerIsHidden ? 'translate(100%)' : 'none', width: '450px', marginTop: '60px' }}
      >
        {metricPreferences.map((m, i) => renderList(m, i))}
      </Drawer>

      <MainMetricsArea
        updateKey={updateKey}
        moveMetric={moveMetric}
        metricPreferences={metricPreferences}
        saveReorderedMetric={saveReorderedMetric}
      />

      <Card
        header={
          <Track>
            <h3>{t('overview.totalChatsChart')}</h3>
          </Track>
        }
      >
        <LineGraph
          data={chartData}
          startDate={formatDate(new Date(), 'yyyy-MM-dd')}
          endDate={formatDate(new Date(), 'yyyy-MM-dd')}
        />
      </Card>

      <Card header={<h3>{t('overview.openSearchDashboard')}</h3>}>
        <Button onClick={() => window.open(openSearchDashboard)}>{t('overview.openSearch')}</Button>
      </Card>
    </DndProvider>
  );
};

export default withAuthorization(OverviewPage, [ROLES.ROLE_ADMINISTRATOR, ROLES.ROLE_ANALYST]);
