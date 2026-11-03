import {useTranslation} from 'react-i18next';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Option} from '../../components/MetricAndPeriodOptions';
import MetricOptionsGroup from '../../components/MetricAndPeriodOptions/MetricOptionsGroup';
import SubOptionsGroup from '../../components/MetricAndPeriodOptions/SubOptionsGroup';
import MetricsCharts from '../../components/MetricsCharts';
import {Button, Card} from '../../components';
import OverviewDateControl from '../../components/overview/OverviewDateControl';
import {
    getChatsStatuses,
    getDistributionOnBuerokrattChatsFeedback,
    getDistributionOnCSAChatsFeedback,
    getDistributionOnSelectedCSAChatsFeedback,
    getNpsAggregateOnSelectedCSAChatsFeedback,
    getNpsFeedbackOnBuerokrattChats,
    getNpsOnCSAChatsFeedback,
    getNpsOnSelectedCSAChatsFeedback,
} from '../../resources/api-constants';
import {MetricOptionsState} from '../../components/MetricAndPeriodOptions/types';
import {
    chartDataKey,
    formatDate,
    getAdvisorChartData,
    getAdvisorsList,
    translateChartKeys,
} from '../../util/charts-utils';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import {BehaviorSubject} from 'rxjs';
import {Methods, request} from '../../util/axios-client';
import withAuthorization, {ROLES} from '../../hoc/with-authorization';
import useStore from '../../store/user/store';
import {randomColor} from 'util/generateRandomColor';
import {ChartData} from 'types/chart';
import {usePeriodStatisticsContext} from 'hooks/usePeriodStatisticsContext';
import {ChatHistory} from "@buerokratt-ria/common-gui-components";
import {useToast} from "../../hooks/useToast";
import {getDomainsArray} from "../../util/multiDomain-utils";
import {getShowTestData} from "../../util/testChat-utils";
import { formatISO } from 'date-fns';
import { mapDistributionChartData } from '../../util/feedback-distribution-utils';
import { DateRange, getRange, OverviewUnit, todayLabelKey } from '../../util/overview-date-utils';
import './FeedbackPage.scss';

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

const getSubOptionIds = (metricOptions: Option[], metric: string) =>
    metricOptions.find((x) => x.id === metric)?.subOptions?.map((x) => x.id) ?? [];

const FeedbackPage: React.FC = () => {
    const {t} = useTranslation();
    const toastContext = useToast();
    const [chartData, setChartData] = useState<ChartData>({
        chartData: [],
        colors: [],
    });
    const advisors = useRef<any[]>([]);
    const lastCsaRangeKey = useRef<string>('');
    const latestConfig = useRef<MetricOptionsState>();
    const advisorColors = useRef<Map<string, string>>(new Map());
    const [advisorsList, setAdvisorsList] = useState<any[]>([]);
    const [currentMetric, setCurrentMetric] = useState('feedback.statuses');
    const [currentConfigs, setCurrentConfigs] = useState<MetricOptionsState>();
    const [unit, setUnit] = useState('');
    const [showSelectAll, setShowSelectAll] = useState<boolean>(false);
    const {setPeriodStatistics} = usePeriodStatisticsContext();
    const [updateKey, setUpdateKey] = useState<number>(0)
    const userDomains = useStore.getState().userDomains;
    const multiDomainEnabled = import.meta.env.REACT_APP_ENABLE_MULTI_DOMAIN?.toLowerCase() === 'true';

    const [dateUnit, setDateUnit] = useState<OverviewUnit>('day');
    const [anchorDate, setAnchorDate] = useState(new Date());
    const [periodRange, setPeriodRange] = useState<DateRange>(() => getRange('month', new Date()));
    const [metric, setMetric] = useState<string>('');
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

    const range = useMemo(
        () => (dateUnit === 'period' ? periodRange : getRange(dateUnit, anchorDate)),
        [dateUnit, anchorDate, periodRange]
    );

    useEffect(() => {
        if (!multiDomainEnabled) return;

        const unsubscribe = useStore.subscribe((state, prevState) => {
            if (
                JSON.stringify(state.userDomains) !==
                JSON.stringify(prevState.userDomains)
            ) {
                advisors.current = [];
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

    const selectedMetricOption = useMemo(
        () => feedbackMetrics.find((x) => x.id === metric),
        [feedbackMetrics, metric]
    );
    const subOptions = selectedMetricOption?.subOptions ?? [];

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
        const includeTotal = (config.options || []).includes('total');
        const eventsForApi = includeTotal || events.length === 0 ? statusOptions : events;
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
            if (includeTotal) {
                const selectedLabels = new Set(
                    events.map((id: string) => t(`feedback.plain_status_options.${id.toLowerCase()}`))
                );
                response.forEach((row: any) => {
                    row[totalLabel] = Object.keys(row).reduce(
                        (sum, k) => sum + (k === chartDataKey ? 0 : (row[k] || 0)),
                        0
                    );
                    Object.keys(row).forEach((k) => {
                        if (k !== chartDataKey && k !== totalLabel && !selectedLabels.has(k)) delete row[k];
                    });
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

    const setSelectedAdvisorSubOptions = (subOptions: Option['subOptions']) => {
        setFeedbackMetrics((prev) =>
            prev.map((option) => (option.id === 'selected_advisor_chats' ? {...option, subOptions} : option))
        );
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

            const advisorsList = getAdvisorsList(res).map((a) => {
                const existing = advisorColors.current.get(a.id);
                const color = existing ?? a.color;
                advisorColors.current.set(a.id, color);
                return { ...a, color };
            });

            if (config !== latestConfig.current) return chartData;

            if (advisors.current.length === 0) {
                advisors.current = advisorsList;
                setSelectedAdvisorSubOptions(advisorsList);
                setAdvisorsList(advisors.current);
            }

            chartData = {
                chartData: getAdvisorChartData(res, advisorsList,'chart.nps'),
                colors: advisorsList.map(({labelKey, color}) => {
                    return {
                        id: labelKey,
                        color,
                    };
                }),
                periodNpsByCsa: result.periodNpsByCsa,
                disableStacking: true,
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

    useEffect(() => {
        if (!metric) return;

        const config: MetricOptionsState = {
            period: '',
            metric,
            start: formatISO(range.start),
            end: formatISO(range.end),
            options: selectedOptions,
            groupByPeriod: dateUnit === 'day' ? 'hour' : 'day',
            urls: userDomains ?? [],
        };

        if (config.metric === 'selected_advisor_chats') {
            const csaRangeKey = `${config.start}|${config.end}`;
            if (lastCsaRangeKey.current !== csaRangeKey) {
                advisors.current = [];
                setSelectedAdvisorSubOptions([]);
            }
            lastCsaRangeKey.current = csaRangeKey;
        }

        setCurrentConfigs(config);
        latestConfig.current = config;
        configsSubject.next(config);

        const selectedOption = feedbackMetrics.find((x) => x.id === config.metric);
        if (!selectedOption) return;
        setCurrentMetric(selectedOption.labelKey);
        setUnit(selectedOption.unit ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [metric, selectedOptions, range]);

    const handleDateUnitChange = (newUnit: OverviewUnit) => {
        if (newUnit === 'period' && dateUnit !== 'period') {
            setPeriodRange(range);
        }
        setDateUnit(newUnit);
    };

    const handleTodayClick = () => {
        if (dateUnit === 'period') {
            setDateUnit('day');
        }
        setAnchorDate(new Date());
    };

    return (
        <>
            <h1>{t('menu.feedback')}</h1>
            <div className="feedback-page">
                <Card>
                    <div className="page-header">
                        <div />
                        <OverviewDateControl
                            unit={dateUnit}
                            anchorDate={anchorDate}
                            range={range}
                            periodRange={periodRange}
                            onUnitChange={handleDateUnitChange}
                            onAnchorChange={setAnchorDate}
                            onPeriodRangeChange={setPeriodRange}
                        />
                        <div className="page-header__end">
                            <Button appearance="secondary" size="s" onClick={handleTodayClick}>
                                {t(todayLabelKey(dateUnit))}
                            </Button>
                        </div>
                    </div>

                    <div className="feedback-page__sections" key={userDomains.join(',')}>
                        <Card>
                            <MetricOptionsGroup
                                options={feedbackMetrics}
                                label={t('general.chooseMetric')}
                                onChange={(newMetric) => {
                                    setMetric(newMetric);
                                    setSelectedOptions(getSubOptionIds(feedbackMetrics, newMetric));
                                }}
                            />
                        </Card>

                        {subOptions.length > 0 && (
                            <Card>
                                <SubOptionsGroup
                                    subOptions={subOptions}
                                    label={t('general.additionalOptions')}
                                    onChange={setSelectedOptions}
                                    enableSelectAll={showSelectAll}
                                />
                            </Card>
                        )}

                        {currentConfigs?.metric !== 'negative_feedback' && (
                            <MetricsCharts
                                title={currentMetric}
                                data={chartData}
                                startDate={currentConfigs?.start ?? formatISO(range.start)}
                                endDate={currentConfigs?.end ?? formatISO(range.end)}
                                groupByPeriod={currentConfigs?.groupByPeriod ?? 'day'}
                                unit={unit}
                            />
                        )}
                        {showNegativeChart && (
                            <div style={{ minHeight: '500px' }}>
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
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </>
    );
};

export default withAuthorization(FeedbackPage, [ROLES.ROLE_ADMINISTRATOR, ROLES.ROLE_ANALYST]);
