import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import OptionsPanel, {Option} from '../../components/MetricAndPeriodOptions';
import {MetricOptionsState} from '../../components/MetricAndPeriodOptions/types';
import MetricsCharts from '../../components/MetricsCharts';
import {
    chartDataKey,
    chartDateFormat,
    getAdvisorChartData,
    getAdvisorsList,
    translateChartKeys,
} from '../../util/charts-utils';
import {fetchData} from './data';
import {chatOptions} from './options';
import withAuthorization, {ROLES} from '../../hoc/with-authorization';
import {ChartData} from 'types/chart';
import {usePeriodStatisticsContext} from 'hooks/usePeriodStatisticsContext';
import useStore from '../../store/user/store';
import {endOfDay, formatISO, startOfDay} from 'date-fns';
import {
    getAvgCsaPresent,
    getAvgPickTime,
    getChatForwards,
    getCsaAvgChatTime,
    getCsaChatsTotal,
} from '../../resources/api-constants';
import {Methods, request} from '../../util/axios-client';
import {getDomainsArray} from '../../util/multiDomain-utils';
import {getShowTestData} from '../../util/testChat-utils';

const CSA_METRIC_IDS = new Set(['num_chats_csa', 'avg_chat_time_csa']);

const ChatsPage: React.FC = () => {
    const {t} = useTranslation();
    const [tableTitleKey, setTableTitleKey] = useState(chatOptions[0].labelKey);
    const [unit, setUnit] = useState(chatOptions[0].unit);
    const [configs, setConfigs] = useState<MetricOptionsState>();
    const [chartData, setChartData] = useState<ChartData>({
        chartData: [],
        colors: [],
    });
    const {setPeriodStatistics} = usePeriodStatisticsContext();
    const [updateKey, setUpdateKey] = useState<number>(0);
    const userDomains = useStore.getState().userDomains;
    const multiDomainEnabled = import.meta.env.REACT_APP_ENABLE_MULTI_DOMAIN?.toLowerCase() === 'true';

    const advisors = useRef<any[]>([]);
    const [showSelectAll, setShowSelectAll] = useState<boolean>(false);
    const [allMetrics, setAllMetrics] = useState<Option[]>([...chatOptions]);

    if (multiDomainEnabled) {
        useStore.subscribe((state, prevState) => {
            if (JSON.stringify(state.userDomains) !== JSON.stringify(prevState.userDomains)) {
                setUpdateKey(prevState => prevState + 1);
            }
        });
    }

    useEffect(() => {
        setPeriodStatistics(chartData, unit);
    }, [chartData, unit, updateKey]);

    useEffect(() => {
        setConfigs(prev => ({
            ...prev!,
            updateKey: updateKey,
        }));
    }, [updateKey]);

    useEffect(() => {
        if (configs) {
            configsSubject.next(configs);
        }
    }, [configs]);

    const [configsSubject] = useState(() => new Subject());

    const fetchHandlerRef = useRef<(config: any) => any>(() => []);

    const fetchChatsForwards = async (config: any) => {
        setShowSelectAll(false);
        let result: ChartData = {chartData: [], colors: []};
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
                colors: chatOptions[6].subOptions!.map(({id, color}) => ({
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
        let result: ChartData = {chartData: [], colors: []};
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
                colors: [{id: 'Average (Min)', color: '#FFB511'}],
                minPointSize: 3,
            };
        } catch (e) {
            console.error(e);
        }
        return result;
    };

    const fetchAveragePresentCsas = async (config: any) => {
        setShowSelectAll(false);
        let result: ChartData = {chartData: [], colors: []};
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
                colors: [{id: 'Average', color: '#FFB511'}],
                minPointSize: 3,
            };
        } catch (e) {
            console.error(e);
        }
        return result;
    };

    const fetchTotalCsaChats = async (config: any) => {
        setShowSelectAll(true);
        let result: ChartData = {chartData: [], colors: []};
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
                },
            });
            const res = response.response;
            const fetchedAdvisors = getAdvisorsList(res);
            const updatedMetrics = [...allMetrics];
            updatedMetrics[9].subOptions = fetchedAdvisors;
            advisors.current = fetchedAdvisors;
            setAllMetrics(updatedMetrics);
            result = {
                chartData: getAdvisorChartData(res, fetchedAdvisors, 'chart.count'),
                colors: allMetrics[9].subOptions!.map(({labelKey, color}) => ({id: labelKey, color})),
            };
        } catch (e) {
            console.error(e);
        }
        return result;
    };

    const fetchAverageCsaChatTime = async (config: any) => {
        setShowSelectAll(true);
        let result: ChartData = {chartData: [], colors: []};
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
            const fetchedAdvisors = getAdvisorsList(res);
            const updatedMetrics = [...allMetrics];
            updatedMetrics[10].subOptions = fetchedAdvisors;
            advisors.current = fetchedAdvisors;
            setAllMetrics(updatedMetrics);
            result = {
                chartData: getAdvisorChartData(res, fetchedAdvisors, 'chart.count'),
                colors: allMetrics[10].subOptions!.map(({labelKey, color}) => ({id: labelKey, color})),
                minPointSize: 3,
            };
        } catch (e) {
            console.error(e);
        }
        return result;
    };

    fetchHandlerRef.current = (config: any) => {
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
            default:
                return fetchData(config);
        }
    };

    useEffect(() => {
        const subscription = configsSubject
            .pipe(distinctUntilChanged(), debounceTime(500), switchMap((config: any) => fetchHandlerRef.current(config)))
            .subscribe((data: any) => data && setChartData(data));
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
                        setShowSelectAll(false);
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
            />
        </>
    );
};

export default withAuthorization(ChatsPage, [ROLES.ROLE_ADMINISTRATOR, ROLES.ROLE_ANALYST]);
