import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type ObservableInput, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import OptionsPanel, { Option } from '../../components/MetricAndPeriodOptions';
import { MetricOptionsState } from '../../components/MetricAndPeriodOptions/types';
import MetricsCharts from '../../components/MetricsCharts';
import {
  chartDataKey,
  chartDateFormat,
  getAdvisorChartData,
  getAdvisorsList,
  translateChartKeys,
} from '../../util/charts-utils';
import { randomColor } from '../../util/generateRandomColor';
import { fetchData } from './data';
import { chatOptions } from './options';
import withAuthorization, { ROLES } from '../../hoc/with-authorization';
import { ChartData } from 'types/chart';
import { usePeriodStatisticsContext } from 'hooks/usePeriodStatisticsContext';
import useStore from '../../store/user/store';
import { endOfDay, formatISO, startOfDay } from 'date-fns';
import {
  getAvgCsaPresent,
  getAvgPickTime,
  getChatForwards,
  getCsaAvgChatTime,
  getCsaChatsTotal,
  getThemeOverview,
  getFollowUpActionOverview,
  getQualityOverview,
  getQualityRatingOverview,
} from '../../resources/api-constants';
import { Methods, request } from '../../util/axios-client';
import { getDomainsArray } from '../../util/multiDomain-utils';
import { getShowTestData } from '../../util/testChat-utils';

const CSA_METRIC_IDS = new Set(['num_chats_csa', 'avg_chat_time_csa']);

type QualityMetricOption = {
  readonly id: string;
  readonly labelKey: string;
  readonly color: string;
  readonly isSelected: boolean;
};

const ChatsPage: React.FC = () => {
  const { t } = useTranslation();
  const [tableTitleKey, setTableTitleKey] = useState(chatOptions[0].labelKey);
  const [unit, setUnit] = useState(chatOptions[0].unit);
  const [configs, setConfigs] = useState<MetricOptionsState>();
  const [chartData, setChartData] = useState<ChartData>({
    chartData: [],
    colors: [],
  });
  const { setPeriodStatistics } = usePeriodStatisticsContext();
  const [updateKey, setUpdateKey] = useState<number>(0);
  const userDomains = useStore.getState().userDomains;
  const multiDomainEnabled = import.meta.env.REACT_APP_ENABLE_MULTI_DOMAIN?.toLowerCase() === 'true';

  const advisors = useRef<any[]>([]);

  const themes = useRef<QualityMetricOption[]>([]);
  const followUpStatuses = useRef<QualityMetricOption[]>([]);
  const qualityRatings = useRef<QualityMetricOption[]>([]);
  const lastFetchKey = useRef<string>('');
  const [showSelectAll, setShowSelectAll] = useState<boolean>(false);
  const [allMetrics, setAllMetrics] = useState<Option[]>([...chatOptions]);

  if (multiDomainEnabled) {
    useStore.subscribe((state, prevState) => {
      if (JSON.stringify(state.userDomains) !== JSON.stringify(prevState.userDomains)) {
        setUpdateKey((prevState) => prevState + 1);
      }
    });
  }

  useEffect(() => {
    setPeriodStatistics(chartData, unit);
  }, [chartData, unit, updateKey]);

  useEffect(() => {
    setConfigs((prev) => ({
      ...prev!,
      updateKey: updateKey,
    }));
  }, [updateKey]);

  useEffect(() => {
    if (configs) {
      configsSubject.next(configs);
    }
  }, [configs]);

  const [configsSubject] = useState(() => new Subject<MetricOptionsState>());

  const fetchHandlerRef = useRef<(config: MetricOptionsState) => ObservableInput<ChartData>>(() => []);

  const fetchChatsForwards = async (config: any) => {
    setShowSelectAll(false);
    let result: ChartData = { chartData: [], colors: [] };
    try {
      const response: any = await request({
        url: getChatForwards(),
        method: Methods.post,
        withCredentials: true,
        data: {
          metric: config?.groupByPeriod ?? 'day',
          start_date: config?.start,
          end_date: config?.end,
          urls: getDomainsArray(),
          showTest: getShowTestData(),
        },
      });
      const res = response.response.map((entry: any) => ({
        ...translateChartKeys(entry, chartDataKey),
        [chartDataKey]: new Date(entry[chartDataKey]).getTime(),
      }));
      const requiredKeys = [chartDataKey, ...config.options];
      const mapped = res.map((item: any) => {
        const returnValue: any = {};
        requiredKeys.forEach((key: string) => {
          if (key === chartDataKey) {
            returnValue[key] = item[key];
          } else {
            const chartKey = t(`chart.${key}`);
            returnValue[chartKey] = item[chartKey];
          }
        });
        return returnValue;
      });
      result = {
        chartData: mapped,
        colors: chatOptions[4].subOptions!.map(({ id, color }) => ({
          id: t(`chart.${id}`),
          color,
        })),
      };
    } catch (e) {
      console.error(e);
    }
    return result;
  };

  const fetchAverageChatPickUpTime = async (config: any) => {
    setShowSelectAll(false);
    let result: ChartData = { chartData: [], colors: [] };
    try {
      const response: any = await request({
        url: getAvgPickTime(),
        method: Methods.post,
        withCredentials: true,
        data: {
          metric: config?.groupByPeriod ?? 'day',
          start_date: config?.start,
          end_date: config?.end,
          urls: getDomainsArray(),
          showTest: getShowTestData(),
        },
      });
      const mapped = response.response.map((entry: any) => ({
        ...translateChartKeys(entry, chartDataKey),
        [chartDataKey]: new Date(entry[chartDataKey]).getTime(),
      }));
      result = {
        chartData: mapped,
        colors: [{ id: 'Average (Min)', color: '#FFB511' }],
        minPointSize: 3,
      };
    } catch (e) {
      console.error(e);
    }
    return result;
  };

  const fetchAveragePresentCsas = async (config: any) => {
    setShowSelectAll(false);
    let result: ChartData = { chartData: [], colors: [] };
    try {
      const response: any = await request({
        url: getAvgCsaPresent(),
        method: Methods.post,
        withCredentials: true,
        data: {
          metric: config?.groupByPeriod ?? 'day',
          start_date: config?.start,
          end_date: config?.end,
        },
      });
      const mapped = response.response.map((entry: any) => ({
        ...translateChartKeys(entry, chartDataKey),
        [chartDataKey]: new Date(entry[chartDataKey]).getTime(),
      }));
      result = {
        chartData: mapped,
        colors: [{ id: 'Average', color: '#FFB511' }],
        minPointSize: 3,
      };
    } catch (e) {
      console.error(e);
    }
    return result;
  };

  const fetchTotalCsaChats = async (config: any) => {
    setShowSelectAll(true);
    let result: ChartData = { chartData: [], colors: [] };
    try {
      const excluded_csas = advisors.current.map((e) => e.id).filter((e) => !config?.options.includes(e));
      const response: any = await request({
        url: getCsaChatsTotal(),
        method: Methods.post,
        withCredentials: true,
        data: {
          metric: config?.groupByPeriod ?? 'day',
          start_date: config?.start,
          end_date: config?.end,
          excluded_csas: excluded_csas.length > 0 ? excluded_csas : [''],
          urls: getDomainsArray(),
          showTest: getShowTestData(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      const res = response.response;
      if (advisors.current.length === 0) {
        const fetchedAdvisors = getAdvisorsList(res);
        advisors.current = fetchedAdvisors;
        const updatedMetrics = [...allMetrics];
        updatedMetrics[7].subOptions = fetchedAdvisors;
        setAllMetrics(updatedMetrics);
      }
      const responseAdvisors = getAdvisorsList(res).map((a) => ({
        ...a,
        color: advisors.current.find((s) => s.id === a.id)?.color ?? a.color,
      }));
      result = {
        chartData: getAdvisorChartData(res, responseAdvisors, 'chart.count'),
        colors: responseAdvisors.map(({ labelKey, color }) => ({ id: labelKey, color })),
      };
    } catch (e) {
      console.error(e);
    }
    return result;
  };

  const fetchAverageCsaChatTime = async (config: any) => {
    setShowSelectAll(true);
    let result: ChartData = { chartData: [], colors: [] };
    try {
      const excluded_csas = advisors.current.map((e) => e.id).filter((e) => !config?.options.includes(e));
      const response: any = await request({
        url: getCsaAvgChatTime(),
        method: Methods.post,
        withCredentials: true,
        data: {
          metric: config?.groupByPeriod ?? 'day',
          start_date: config?.start,
          end_date: config?.end,
          excluded_csas: excluded_csas.length > 0 ? excluded_csas : [''],
          urls: getDomainsArray(),
          showTest: getShowTestData(),
        },
      });
      const res = response.response;
      if (advisors.current.length === 0) {
        const fetchedAdvisors = getAdvisorsList(res);
        advisors.current = fetchedAdvisors;
        const updatedMetrics = [...allMetrics];
        updatedMetrics[8].subOptions = fetchedAdvisors;
        setAllMetrics(updatedMetrics);
      }
      const responseAdvisors = getAdvisorsList(res).map((a) => ({
        ...a,
        color: advisors.current.find((s) => s.id === a.id)?.color ?? a.color,
      }));
      result = {
        chartData: getAdvisorChartData(res, responseAdvisors, 'chart.count'),
        colors: responseAdvisors.map(({ labelKey, color }) => ({ id: labelKey, color })),
        minPointSize: 3,
      };
    } catch (e) {
      console.error(e);
    }
    return result;
  };

  const fetchThemeOverview = async (config: MetricOptionsState): Promise<ChartData> => {
    setShowSelectAll(true);
    let result: ChartData = { chartData: [], colors: [] };
    try {
      const excluded_themes = themes.current.map((th) => th.id).filter((id) => !config.options.includes(id));
      const response = await request<
        Readonly<{
          start_date: string;
          end_date: string;
          excluded_themes: string[];
          urls: (string | null)[];
          showTest: boolean;
        }>,
        { response: { theme: string; count: number }[] }
      >({
        url: getThemeOverview(),
        method: Methods.post,
        withCredentials: true,
        data: {
          start_date: config.start,
          end_date: config.end,
          excluded_themes: excluded_themes.length > 0 ? excluded_themes : [''],
          urls: getDomainsArray(),
          showTest: getShowTestData(),
        },
      });
      const res = response.response;
      const fetchedThemes: QualityMetricOption[] = res.map((item) => ({
        id: item.theme,
        labelKey: item.theme,
        color: themes.current.find((th) => th.id === item.theme)?.color ?? randomColor(),
        isSelected: true,
      }));
      if (themes.current.length === 0) {
        themes.current = fetchedThemes;
      }
      const updatedMetrics = [...allMetrics];
      updatedMetrics[9].subOptions = themes.current;
      setAllMetrics(updatedMetrics);
      const themeData: Record<string, number> = {};
      res.forEach((item) => {
        themeData[item.theme] = item.count;
      });
      result = {
        chartData: [themeData],
        colors: themes.current.map(({ id, color }) => ({ id, color })),
      };
    } catch (e) {
      console.error(e);
    }
    return result;
  };

  const fetchQualityRatingOverview = async (config: MetricOptionsState): Promise<ChartData> => {
    setShowSelectAll(true);
    let result: ChartData = { chartData: [], colors: [] };
    try {
      const excluded_quality = qualityRatings.current
        .map((q) => q.id)
        .filter((id) => !config.options.includes(id));
      const response = await request<
        Readonly<{
          start_date: string;
          end_date: string;
          excluded_quality: string[];
          urls: (string | null)[];
          showTest: boolean;
        }>,
        { response: { quality: string; count: number }[] }
      >({
        url: getQualityRatingOverview(),
        method: Methods.post,
        withCredentials: true,
        data: {
          start_date: config.start,
          end_date: config.end,
          excluded_quality: excluded_quality.length > 0 ? excluded_quality : [''],
          urls: getDomainsArray(),
          showTest: getShowTestData(),
        },
      });
      const res = response.response;
      const fetchedQualityRatings: QualityMetricOption[] = res.map((item) => ({
        id: item.quality,
        labelKey: item.quality,
        color: qualityRatings.current.find((q) => q.id === item.quality)?.color ?? randomColor(),
        isSelected: true,
      }));
      if (qualityRatings.current.length === 0) {
        qualityRatings.current = fetchedQualityRatings;
      }
      const updatedMetrics = [...allMetrics];
      updatedMetrics[11].subOptions = qualityRatings.current;
      setAllMetrics(updatedMetrics);
      const qualityData: Record<string, number> = {};
      res.forEach((item) => {
        qualityData[item.quality] = item.count;
      });
      result = {
        chartData: [qualityData],
        colors: qualityRatings.current.map(({ id, color }) => ({ id, color })),
      };
    } catch (e) {
      console.error(e);
    }
    return result;
  };

  const fetchQualityOverview = async (config: MetricOptionsState): Promise<ChartData> => {
    setShowSelectAll(true);
    let result: ChartData = { chartData: [], colors: [] };
    try {
      const response = await request<
        Readonly<{ start_date: string; end_date: string; period: string; urls: (string | null)[]; showTest: boolean; timezone: string }>,
        {
          response: [
            { time: string; total: number; themes: number; responseQuality: number; followUp: number }[],
            {
              totalChats: string;
              chatsWithThemes: string;
              totalBuerokrattChats: string;
              buerokrattChatsWithQuality: string;
              chatsWithFollowUp: string;
            }[],
          ];
        }
      >({
        url: getQualityOverview(),
        method: Methods.post,
        withCredentials: true,
        data: {
          start_date: config.start,
          end_date: config.end,
          period: config.groupByPeriod || 'day',
          urls: getDomainsArray(),
          showTest: getShowTestData(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      const chartRows = response.response[0] ?? [];
      const summary = response.response[1]?.[0];
      const activeOptions: string[] = config.options ?? [];

      const chartData = chartRows.map((row) => {
        const obj: Record<string, number | string> = {
          [chartDataKey]: new Date(row.time).getTime(),
          [t('chats.totalCount')]: row.total,
        };
        if (activeOptions.includes('themes')) obj[t('chats.themes')] = row.themes;
        if (activeOptions.includes('response_quality')) obj[t('chats.responseQuality')] = row.responseQuality;
        if (activeOptions.includes('follow_up')) obj[t('chats.followUp')] = row.followUp;
        return obj;
      });

      const colors: { id: string; color: string }[] = [{ id: t('chats.totalCount'), color: '#008000' }];
      if (activeOptions.includes('themes')) colors.push({ id: t('chats.themes'), color: '#fdbf47' });
      if (activeOptions.includes('response_quality')) colors.push({ id: t('chats.responseQuality'), color: '#ed7d32' });
      if (activeOptions.includes('follow_up')) colors.push({ id: t('chats.followUp'), color: '#8ab4d5' });

      result = {
        chartData,
        colors,
        qualityData: summary
          ? {
              totalChats: parseInt(summary.totalChats) || 0,
              chatsWithThemes: parseInt(summary.chatsWithThemes) || 0,
              totalBuerokrattChats: parseInt(summary.totalBuerokrattChats) || 0,
              buerokrattChatsWithQuality: parseInt(summary.buerokrattChatsWithQuality) || 0,
              chatsWithFollowUp: parseInt(summary.chatsWithFollowUp) || 0,
            }
          : undefined,
      };
    } catch (e) {
      console.error(e);
    }
    return result;
  };

  const fetchFollowUpActionOverview = async (config: MetricOptionsState): Promise<ChartData> => {
    setShowSelectAll(true);
    let result: ChartData = { chartData: [], colors: [] };
    try {
      const excluded_actions = followUpStatuses.current.map((s) => s.id).filter((id) => !config.options.includes(id));
      const response = await request<
        Readonly<{
          start_date: string;
          end_date: string;
          excluded_actions: string[];
          urls: (string | null)[];
          showTest: boolean;
        }>,
        { response: { followUpAction: string; count: number }[] }
      >({
        url: getFollowUpActionOverview(),
        method: Methods.post,
        withCredentials: true,
        data: {
          start_date: config.start,
          end_date: config.end,
          excluded_actions: excluded_actions.length > 0 ? excluded_actions : [''],
          urls: getDomainsArray(),
          showTest: getShowTestData(),
        },
      });
      const res = response.response;
      const fetchedStatuses = res.map((item) => ({
        id: item.followUpAction,
        labelKey: item.followUpAction,
        color: followUpStatuses.current.find((s) => s.id === item.followUpAction)?.color ?? randomColor(),
        isSelected: true,
      }));
      if (followUpStatuses.current.length === 0) {
        followUpStatuses.current = fetchedStatuses;
      }
      const updatedMetrics = [...allMetrics];
      updatedMetrics[10].subOptions = followUpStatuses.current;
      setAllMetrics(updatedMetrics);
      const actionData: Record<string, number> = {};
      res.forEach((item) => {
        actionData[item.followUpAction] = item.count;
      });
      result = {
        chartData: [actionData],
        colors: followUpStatuses.current.map(({ id, color }) => ({ id, color })),
      };
    } catch (e) {
      console.error(e);
    }
    return result;
  };

  fetchHandlerRef.current = (config: MetricOptionsState) => {
    switch (config.metric) {
      case 'chat_forwards':
        return fetchChatsForwards(config);
      case 'avg_pick_time':
        return fetchAverageChatPickUpTime(config);
      case 'avg_present_csa':
        return fetchAveragePresentCsas(config);
      case 'num_chats_csa':
        return fetchTotalCsaChats(config);
      case 'avg_chat_time_csa':
        return fetchAverageCsaChatTime(config);
      case 'theme_overview':
        return fetchThemeOverview(config);
      case 'follow_up_action_overview':
        return fetchFollowUpActionOverview(config);
      case 'quality_overview':
        return fetchQualityRatingOverview(config);
      case 'chat_analysis_overview':
        return fetchQualityOverview(config);
      default:
        return fetchData(config);
    }
  };

  useEffect(() => {
    const subscription = configsSubject
      .pipe(
        distinctUntilChanged(),
        debounceTime(500),
        switchMap((config) => fetchHandlerRef.current(config))
      )
      .subscribe((data: ChartData) => data && setChartData(data));
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <h1>{t('menu.chats')}</h1>
      <OptionsPanel
        metricOptions={allMetrics}
        enableSelectAll={showSelectAll}
        dateFormat={chartDateFormat}
        onChange={(config) => {
          config.urls = userDomains ?? [];
          if (!CSA_METRIC_IDS.has(config.metric)) {
            advisors.current = [];
          }
          const fetchKey = `${config.metric}|${config.start}|${config.end}`;
          const rangeOrMetricChanged = lastFetchKey.current !== fetchKey;
          lastFetchKey.current = fetchKey;
          if (
            config.metric !== 'theme_overview' &&
            config.metric !== 'follow_up_action_overview' &&
            config.metric !== 'quality_overview' &&
            config.metric !== 'chat_analysis_overview'
          ) {
            themes.current = [];
            followUpStatuses.current = [];
            qualityRatings.current = [];
            if (!CSA_METRIC_IDS.has(config.metric)) {
              setShowSelectAll(false);
            }
          } else if (config.metric === 'theme_overview') {
            followUpStatuses.current = [];
            qualityRatings.current = [];
            if (rangeOrMetricChanged) themes.current = [];
            setShowSelectAll(true);
          } else if (config.metric === 'follow_up_action_overview') {
            themes.current = [];
            qualityRatings.current = [];
            if (rangeOrMetricChanged) followUpStatuses.current = [];
            setShowSelectAll(true);
          } else if (config.metric === 'quality_overview') {
            themes.current = [];
            followUpStatuses.current = [];
            if (rangeOrMetricChanged) qualityRatings.current = [];
            setShowSelectAll(true);
          } else if (config.metric === 'chat_analysis_overview') {
            themes.current = [];
            followUpStatuses.current = [];
            qualityRatings.current = [];
            setShowSelectAll(true);
          }
          setConfigs(config);
          configsSubject.next(config);
          const selectedOption = allMetrics.find((x) => x.id === config.metric);
          if (!selectedOption) return;
          setTableTitleKey(selectedOption.labelKey);
          setUnit(selectedOption.unit);
        }}
      />
      <MetricsCharts
        title={tableTitleKey}
        data={chartData}
        startDate={configs?.start ?? formatISO(startOfDay(new Date()))}
        endDate={configs?.end ?? formatISO(endOfDay(new Date()))}
        unit={unit}
        groupByPeriod={configs?.groupByPeriod ?? 'day'}
        defaultChartType={allMetrics.find((x) => x.id === configs?.metric)?.defaultChartType}
      />
    </>
  );
};

export default withAuthorization(ChatsPage, [ROLES.ROLE_ADMINISTRATOR, ROLES.ROLE_ANALYST]);
