import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import OptionsPanel, {Option} from '../../components/MetricAndPeriodOptions';
import {MetricOptionsState} from '../../components/MetricAndPeriodOptions/types';
import MetricsCharts from '../../components/MetricsCharts';
import {chartDateFormat} from '../../util/charts-utils';
import {randomColor} from '../../util/generateRandomColor';
import {fetchData} from './data';
import {chatOptions} from './options';
import withAuthorization, {ROLES} from '../../hoc/with-authorization';
import {ChartData} from 'types/chart';
import {usePeriodStatisticsContext} from 'hooks/usePeriodStatisticsContext';
import useStore from '../../store/user/store';
import {endOfDay, formatISO, startOfDay} from 'date-fns';
import {getFollowUpActionOverview, getThemeOverview} from '../../resources/api-constants';
import {Methods, request} from '../../util/axios-client';
import {getDomainsArray} from '../../util/multiDomain-utils';
import {getShowTestData} from '../../util/testChat-utils';

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

    const themes = useRef<any[]>([]);
    const followUpStatuses = useRef<any[]>([]);
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

    const fetchThemeOverview = async (config: any) => {
        setShowSelectAll(true);
        let result: ChartData = {chartData: [], colors: []};
        try {
            const excluded_themes = themes.current.map((th) => th.id).filter((id) => !config?.options.includes(id));
            const response: any = await request({
                url: getThemeOverview(),
                method: Methods.post,
                withCredentials: true,
                data: {
                    start_date: config?.start,
                    end_date: config?.end,
                    excluded_themes: excluded_themes.length > 0 ? excluded_themes : [''],
                    urls: getDomainsArray(),
                    showTest: getShowTestData(),
                },
            });
            const res: {theme: string; count: number}[] = response.response;
            const fetchedThemes = res.map((item) => ({
                id: item.theme,
                labelKey: item.theme,
                color: themes.current.find((th) => th.id === item.theme)?.color ?? randomColor(),
                isSelected: true,
            }));
            if (themes.current.length === 0) {
                themes.current = fetchedThemes;
            }
            const updatedMetrics = [...allMetrics];
            updatedMetrics[4].subOptions = themes.current;
            setAllMetrics(updatedMetrics);
            const themeData: Record<string, number> = {};
            res.forEach((item) => {
                themeData[item.theme] = item.count;
            });
            result = {
                chartData: [themeData],
                colors: themes.current.map(({id, color}) => ({id, color})),
            };
        } catch (e) {
            console.error(e);
        }
        return result;
    };

    const fetchFollowUpActionOverview = async (config: any) => {
        setShowSelectAll(true);
        let result: ChartData = {chartData: [], colors: []};
        try {
            const excluded_actions = followUpStatuses.current.map((s) => s.id).filter((id) => !config?.options.includes(id));
            const response: any = await request({
                url: getFollowUpActionOverview(),
                method: Methods.post,
                withCredentials: true,
                data: {
                    start_date: config?.start,
                    end_date: config?.end,
                    excluded_actions: excluded_actions.length > 0 ? excluded_actions : [''],
                    urls: getDomainsArray(),
                    showTest: getShowTestData(),
                },
            });
            const res: {followUpAction: string; count: number}[] = response.response;
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
            updatedMetrics[5].subOptions = followUpStatuses.current;
            setAllMetrics(updatedMetrics);
            const actionData: Record<string, number> = {};
            res.forEach((item) => {
                actionData[item.followUpAction] = item.count;
            });
            result = {
                chartData: [actionData],
                colors: followUpStatuses.current.map(({id, color}) => ({id, color})),
            };
        } catch (e) {
            console.error(e);
        }
        return result;
    };

    fetchHandlerRef.current = (config: any) => {
        if (config.metric === 'theme_overview') {
            return fetchThemeOverview(config);
        }
        if (config.metric === 'follow_up_action_overview') {
            return fetchFollowUpActionOverview(config);
        }
        return fetchData(config);
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
                    if (config.metric !== 'theme_overview' && config.metric !== 'follow_up_action_overview') {
                        themes.current = [];
                        followUpStatuses.current = [];
                        setShowSelectAll(false);
                    } else if (config.metric === 'theme_overview') {
                        followUpStatuses.current = [];
                    } else if (config.metric === 'follow_up_action_overview') {
                        themes.current = [];
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
