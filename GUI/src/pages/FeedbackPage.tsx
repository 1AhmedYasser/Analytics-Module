import {useTranslation} from 'react-i18next';
import React, {useEffect, useRef, useState} from 'react';
import OptionsPanel, {Option} from '../components/MetricAndPeriodOptions';
import MetricsCharts from '../components/MetricsCharts';
import {
    getChatsStatuses,
    getDistributionOnBuerokrattChatsFeedback,
    getDistributionOnCSAChatsFeedback,
    getDistributionOnSelectedCSAChatsFeedback,
    getNpsAggregateOnSelectedCSAChatsFeedback,
    getNpsFeedbackOnBuerokrattChats,
    getNpsOnCSAChatsFeedback,
    getNpsOnSelectedCSAChatsFeedback,
} from '../resources/api-constants';
import {MetricOptionsState} from '../components/MetricAndPeriodOptions/types';
import {
    chartDataKey,
    formatDate,
    getAdvisorChartData,
    getAdvisorsList,
    translateChartKeys,
} from '../util/charts-utils';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import {BehaviorSubject} from 'rxjs';
import {Methods, request} from '../util/axios-client';
import withAuthorization, {ROLES} from '../hoc/with-authorization';
import useStore from '../store/user/store';
import {randomColor} from 'util/generateRandomColor';
import {ChartData} from 'types/chart';
import {usePeriodStatisticsContext} from 'hooks/usePeriodStatisticsContext';
import {ChatHistory} from "@buerokratt-ria/common-gui-components";
import {useToast} from "../hooks/useToast";
import {getDomainsArray} from "../util/multiDomain-utils";
import {getShowTestData} from "../util/testChat-utils";
import { endOfDay, formatISO, startOfDay } from 'date-fns';

const FEEDBACK_Y_AXIS_MAX = 20;

const statusOptions = [
    'CLIENT_LEFT_WITH_ACCEPTED',
    'CLIENT_LEFT_WITH_NO_RESOLUTION',
    'CLIENT_LEFT_FOR_UNKNOWN_REASONS',
    'ACCEPTED',
    'HATE_SPEECH',
    'OTHER',
    'RESPONSE_SENT_TO_CLIENT_EMAIL',
    'contact-information-skipped',
    'user-reached',
    'user-not-reached',
];

const FeedbackPage: React.FC = () => {
    const {t} = useTranslation();
    const toastContext = useToast();
    const [chartData, setChartData] = useState<ChartData>({
        chartData: [],
        colors: [],
    });
    const advisors = useRef<any[]>([]);
    const [advisorsList, setAdvisorsList] = useState<any[]>([]);
    const [currentMetric, setCurrentMetric] = useState('feedback.statuses');
    const [currentConfigs, setCurrentConfigs] = useState<MetricOptionsState>();
    const [unit, setUnit] = useState('');
    const [showSelectAll, setShowSelectAll] = useState<boolean>(false);
    const {setPeriodStatistics} = usePeriodStatisticsContext();
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

    useEffect(() => {
        setAdvisorsList(advisors.current);
    }, [advisorsList.length]);

    useEffect(() => {
        setPeriodStatistics(chartData.feedBackData ? {...chartData.feedBackData} : chartData, unit);
    }, [chartData, unit]);

    const [feedbackMetrics, setFeedbackMetrics] = useState<Option[]>([
      {
        id: 'statuses',
        labelKey: 'feedback.statuses',
        subOptions: [
          ...statusOptions.map((id) => ({
            id,
            labelKey: `feedback.status_options.${id.toLowerCase()}`,
            color: randomColor(),
            isSelected: true,
          })),
          { id: 'total', labelKey: 'chats.totalCount', color: '#008000', isSelected: true },
        ],
        unit: t('units.chats') ?? 'chats',
      },
      {
        id: 'burokratt_chats',
        labelKey: 'feedback.burokratt_chats',
        unit: '',
      },
      {
        id: 'advisor_chats',
        labelKey: 'feedback.advisor_chats',
        unit: '',
      },
      {
        id: 'selected_advisor_chats',
        labelKey: 'feedback.selected_advisor_chats',
        unit: '',
      },
      {
        id: 'negative_feedback',
        labelKey: 'feedback.negative_feedback',
        unit: t('units.feedback') ?? 'feedback',
      },
    ]);

    const showNegativeChart = currentConfigs?.metric === 'negative_feedback';

    const [configsSubject] = useState(
        () => new BehaviorSubject<any>(null)
    );

    useEffect(() => {
        const subscription = configsSubject
            .pipe(
                distinctUntilChanged(),
                debounceTime(300),
                switchMap(async (config: any) => {
                    switch (config.metric) {
                        case 'statuses':
                            return fetchChatsStatuses(config);
                        case 'burokratt_chats': {
                            const [distributionData, feedBackData] = await Promise.all([
                                fetchDistributionOnBuerokrattChatsFeedback(config),
                                fetchNpsFeedbackOnBuerokrattChats(config),
                            ]);
                            return {distributionData, feedBackData};
                        }
                        case 'advisor_chats': {
                            const [distributionData, feedBackData] = await Promise.all([
                                fetchDistributionOnCSAChatsFeedback(config),
                                fetchNpsOnCSAChatsFeedback(config),
                            ]);
                            return {distributionData, feedBackData};
                        }
                        case 'selected_advisor_chats': {
                            const [distributionData, feedBackData] = await Promise.all([
                                fetchDistributionOnSelectedCSAChatsFeedback(config),
                                fetchNpsAggregateOnSelectedCSAChatsFeedback(config),
                            ]);
                            await fetchNpsOnSelectedCSAChatsFeedback(config);
                            return {distributionData, feedBackData};
                        }
                        case 'negative_feedback':
                            return {};
                        default:
                            return fetchChatsStatuses(config);
                    }
                })
            )
            .subscribe((chartData: any) => setChartData(chartData));

        return () => {
            subscription.unsubscribe();
        };
    }, [updateKey]);

    const fetchChatsStatuses = async (config: MetricOptionsState) => {
        setShowSelectAll(false);
        let chartData = {};
        const events = (config.options || []).filter((e: string) => e !== 'total');
        const eventsForApi = events.length > 0 ? events : statusOptions;
        try {
            const result: any = await request({
                url: getChatsStatuses(),
                method: Methods.post,
                withCredentials: true,
                data: {
                    metric: config?.groupByPeriod ?? 'day',
                    start_date: config?.start,
                    end_date: config?.end,
                    events: eventsForApi,
                    csa_events: eventsForApi,
                    urls: getDomainsArray(),
                    showTest: getShowTestData()
                },
            });

            const response = result.response
                .flat(1)
                .map((entry: any) => ({
                    ...translateChartKeys(entry, chartDataKey),
                    [chartDataKey]: new Date(entry[chartDataKey]).getTime(),
                }))
                .reduce((a: any, b: any) => {
                    const dateRow = a.find((i: any) => i[chartDataKey] === b[chartDataKey]);
                    const key = t(`feedback.plain_status_options.${b[t('chart.event')].toLowerCase()}`);
                    if (dateRow) {
                        dateRow[key] = b[t('chart.count')];
                    } else {
                        a.push({ [chartDataKey]: b[chartDataKey], [key]: b[t('chart.count')] });
                    }
                    return a;
                }, []);

            const totalLabel = t('chats.totalCount');
            if ((config.options || []).includes('total')) {
                response.forEach((row: any) => {
                    row[totalLabel] = Object.keys(row).reduce(
                        (sum, k) => sum + (k === chartDataKey ? 0 : (row[k] || 0)),
                        0
                    );
                });
            }

            const subOpts = feedbackMetrics[0].subOptions!;
            chartData = {
                chartData: response,
                colors: subOpts.map(({ id, color }) => ({
                    id: id === 'total' ? totalLabel : t(`feedback.plain_status_options.${id.toLowerCase()}`),
                    color,
                })),
            };
        } catch (err) {
            console.error("Failed: ", err)
        }
        return chartData;
    };

    const fetchNpsFeedbackOnBuerokrattChats = async (config: any) => {
        setShowSelectAll(false);
        let chartData = {};
        try {
            const {result, response} = await fetchAndMapFeedbackData(getNpsFeedbackOnBuerokrattChats, config);

            chartData = {
                chartData: response,
                colors: [{id: 'NPS', color: '#FFB511'}],
                periodNps: result.periodNps,
            };
        } catch (err) {
            console.error("Failed: ", err)
        }
        return chartData;
    };

    const fetchDistributionOnBuerokrattChatsFeedback = async (config: any) => {
        setShowSelectAll(false);
        let chartData = {};
        try {
            const result: any = await request({
                url: getDistributionOnBuerokrattChatsFeedback(),
                method: Methods.post,
                withCredentials: true,
                data: {
                    start_date: config?.start,
                    end_date: config?.end,
                    urls: getDomainsArray(),
                    showTest: getShowTestData()
                },
            });

            const body = result.response ?? result;
            chartData = mapDistributionChartData(body);
        } catch (e) {
            console.error(e);
        }
        return chartData;
    };

    const fetchNpsOnCSAChatsFeedback = async (config: any) => {
        setShowSelectAll(false);
        let chartData = {};
        try {
            const {result, response} = await fetchAndMapFeedbackData(getNpsOnCSAChatsFeedback, config);

            chartData = {
                chartData: response,
                colors: [{id: 'NPS', color: '#FFB511'}],
                periodNps: result.periodNps,
            };
        } catch (err) {
            console.error("Failed: ", err)
        }
        return chartData;
    };

    const fetchDistributionOnCSAChatsFeedback = async (config: any) => {
        setShowSelectAll(false);
        let chartData = {};
        try {
            const result: any = await request({
                url: getDistributionOnCSAChatsFeedback(),
                method: Methods.post,
                withCredentials: true,
                data: {
                    start_date: config?.start,
                    end_date: config?.end,
                    urls: getDomainsArray(),
                    showTest: getShowTestData()
                },
            });
            const body = result.response ?? result;
            chartData = mapDistributionChartData(body);
        } catch (e) {
            console.error(e);
        }
        return chartData;
    };

    const getExcludedCsas = (config: any) => {
        const excluded_csas = advisors.current.map((e: any) => e.id).filter((e: string) => !config?.options?.includes(e));
        return (excluded_csas.length ?? 0) > 0 ? excluded_csas : [''];
    };

    const fetchDistributionOnSelectedCSAChatsFeedback = async (config: any) => {
        setShowSelectAll(true);
        let chartData = {};
        try {
            const result: any = await request({
                url: getDistributionOnSelectedCSAChatsFeedback(),
                method: Methods.post,
                withCredentials: true,
                data: {
                    start_date: config?.start,
                    end_date: config?.end,
                    urls: getDomainsArray(),
                    showTest: getShowTestData(),
                    excluded_csas: getExcludedCsas(config),
                },
            });
            const body = result.response ?? result;
            chartData = mapDistributionChartData(body);
        } catch (e) {
            console.error(e);
        }
        return chartData;
    };

    const fetchNpsAggregateOnSelectedCSAChatsFeedback = async (config: any) => {
        setShowSelectAll(true);
        let chartData = {};
        try {
            const result: any = await request({
                url: getNpsAggregateOnSelectedCSAChatsFeedback(),
                method: Methods.post,
                withCredentials: true,
                data: {
                    metric: config?.groupByPeriod ?? 'day',
                    start_date: config?.start,
                    end_date: config?.end,
                    urls: getDomainsArray(),
                    showTest: getShowTestData(),
                    excluded_csas: getExcludedCsas(config),
                },
            });
            const response = result.response.map((entry: any) => ({
                ...translateChartKeys(entry, chartDataKey),
                [chartDataKey]: new Date(entry[chartDataKey]).getTime(),
            }));
            chartData = {
                chartData: response,
                colors: [{ id: 'NPS', color: '#FFB511' }],
                periodNps: result.periodNps,
            };
        } catch (err) {
            console.error('Failed: ', err);
        }
        return chartData;
    };

    const fetchNpsOnSelectedCSAChatsFeedback = async (config: any) => {
        setShowSelectAll(true);
        let chartData = {};
        try {
            const result: any = await request({
                url: getNpsOnSelectedCSAChatsFeedback(),
                method: Methods.post,
                withCredentials: true,
                data: {
                    metric: config?.groupByPeriod ?? 'day',
                    start_date: config?.start,
                    end_date: config?.end,
                    excluded_csas: getExcludedCsas(config),
                    urls: getDomainsArray(),
                    showTest: getShowTestData()
                },
            });

            const res = result.response;

            const advisorsList = getAdvisorsList(res);

            if (advisorsList.length > advisors.current.length) {
                const updatedMetrics = [...feedbackMetrics];
                updatedMetrics[3].subOptions = advisorsList;
                advisors.current = advisorsList;
                setFeedbackMetrics(updatedMetrics);
                setAdvisorsList(advisors.current);
            } else if (advisors.current.length === 0) {
                const updatedMetrics = [...feedbackMetrics];
                updatedMetrics[3].subOptions = [];
                advisors.current = [];
                setFeedbackMetrics(updatedMetrics);
                setAdvisorsList([]);
            }

            chartData = {
                chartData: getAdvisorChartData(res, advisorsList,'chart.nps'),
                colors: feedbackMetrics[3].subOptions!.map(({labelKey, color}) => {
                    return {
                        id: labelKey,
                        color,
                    };
                }),
                periodNpsByCsa: result.periodNpsByCsa,
            };
        } catch (err) {
            console.error("Failed: ", err)
        }
        return chartData;
    };

    const fetchAndMapFeedbackData = async (
        urlFunction: () => string,
        config: { groupByPeriod?: string; start?: string; end?: string }
    ) => {
        const result: any = await request({
            url: urlFunction(),
            method: Methods.post,
            withCredentials: true,
            data: {
                metric: config?.groupByPeriod ?? 'day',
                start_date: config?.start,
                end_date: config?.end,
                urls: getDomainsArray(),
                showTest: getShowTestData()
            },
        });

        const response = result.response.map((entry: any) => ({
            ...translateChartKeys(entry, chartDataKey),
            [chartDataKey]: new Date(entry[chartDataKey]).getTime(),
        }));

        return {result, response};
    };

    const getRatingBuckets = (isFiveScale: boolean) =>
        isFiveScale ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const getRoundedDistributionMax = (maxCount: number) => {
        if (maxCount <= 10) return 10;
        return Math.ceil(maxCount / 10) * 10;
    };

    const mapDistributionChartData = (result: any) => {
        const response = result.response ?? result;
        const raw = Array.isArray(response) ? response[0] : response;
        const data: {
            distribution?: {
                rating: number | string;
                count: number;
            }[],
            total_feedback?: number;
            total_chats?: number;
            is_five_scale?: boolean;
        } = raw?.result?.value
                ? JSON.parse(raw.result.value)
                : (raw?.result ?? raw);
        const distribution = data?.distribution ?? [];
        const totalFeedback = data?.total_feedback ?? 0;
        const totalChats = data?.total_chats ?? 0;
        const scaleIsFive = data?.is_five_scale ?? false;
        const noFeedbackCount = totalChats - totalFeedback;
        const ratingBuckets = getRatingBuckets(scaleIsFive);
        const distributionByRating = distribution.reduce<Map<number, number>>((acc, entry) => {
            if (entry.rating === '-') return acc;

            const numericRating = Number(entry.rating);
            if (!Number.isFinite(numericRating) || !ratingBuckets.includes(numericRating)) {
                return acc;
            }

            acc.set(numericRating, entry.count);
            return acc;
        }, new Map<number, number>());

        const chartData = ratingBuckets.map((rating: number) => {
            const count = distributionByRating.get(rating) ?? 0;
            return {
                rating,
                count,
            };
        });

        const yAxisMax = getRoundedDistributionMax(
            Math.max(...chartData.map((entry) => entry.count), 0)
        );

        const colors = [
            { id: 'count', color: '#FFB511' },
            ...chartData.map((entry) => ({
                id: String(entry.rating),
                color: randomColor(),
            })),
        ];

        return {
            chartData,
            colors,
            isRatingDistribution: true,
            totalFeedback,
            totalChats,
            noFeedbackCount,
            isFiveScale: scaleIsFive,
            yAxisMax,
        };
    };

    return (
        <>
            <h1>{t('menu.feedback')}</h1>
            <OptionsPanel
                metricOptions={feedbackMetrics}
                enableSelectAll={showSelectAll}
                dateFormat="yyyy-MM-dd"
                onChange={(config) => {
                        setCurrentConfigs(config);
                        configsSubject.next(config);
                        setCurrentMetric(`feedback.${config.metric}`);

                        const selectedOption = feedbackMetrics.find((x) => x.id === config.metric);
                        if (!selectedOption) return;
                        setUnit(selectedOption.unit ?? '');
                    }
                }
            />
            {currentConfigs?.metric !== 'negative_feedback' && (
                <MetricsCharts
                    title={currentMetric}
                    data={chartData}
                    startDate={currentConfigs?.start ?? formatISO(startOfDay(new Date()))}
                    endDate={currentConfigs?.end ?? formatISO(endOfDay(new Date()))}
                    groupByPeriod={currentConfigs?.groupByPeriod ?? 'day'}
                    unit={unit}
                />
            )}
            {showNegativeChart && (
                <ChatHistory
                    toastContext={toastContext}
                    displayDateFilter={false}
                    displaySearchBar={false}
                    displayTitle={false}
                    showStatus={false}
                    delegatedEndDate={formatDate(new Date(currentConfigs?.end ?? Date.now()), 'yyyy-MM-dd')}
                    delegatedStartDate={formatDate(new Date(currentConfigs?.start ?? Date.now()), 'yyyy-MM-dd')}
                    user={useStore.getState().userInfo}
                    userDomains={useStore}
                />
            )}
        </>
    );
};

export default withAuthorization(FeedbackPage, [ROLES.ROLE_ADMINISTRATOR, ROLES.ROLE_ANALYST]);
