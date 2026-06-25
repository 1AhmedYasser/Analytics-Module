import React, {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Subject} from 'rxjs'
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators'
import OptionsPanel from '../../components/MetricAndPeriodOptions'
import {MetricOptionsState} from '../../components/MetricAndPeriodOptions/types'
import MetricsCharts from '../../components/MetricsCharts'
import {chartDateFormat} from '../../util/charts-utils'
import {fetchData} from './data'
import {metricOptions} from './options'
import withAuthorization, {ROLES} from '../../hoc/with-authorization'
import useStore from "../../store/user/store";
import { endOfDay, formatISO, startOfDay } from 'date-fns'

const BurokrattPage: React.FC = () => {
    const {t} = useTranslation()
    const [tableTitleKey, setTableTitleKey] = useState(metricOptions[0].labelKey)
    const [configs, setConfigs] = useState<MetricOptionsState>()
    const [chartData, setChartData] = useState([])
    const [unit, setUnit] = useState(metricOptions[0].unit)
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

    const [configsSubject] = useState(() => new Subject())
    useEffect(() => {
        const subscription = configsSubject
            .pipe(
                distinctUntilChanged(),
                debounceTime(500),
                switchMap(fetchData),
            )
            .subscribe((data: any) => data && setChartData(data))

        return () => {
            subscription.unsubscribe()
        }
    }, [updateKey])

    return (
        <>
            <h1>{t('menu.burokratt')}</h1>
            <OptionsPanel
                metricOptions={metricOptions}
                onChange={(config) => {
                    setConfigs(config)
                    configsSubject.next(config)
                    const selectedOption = metricOptions.find((x) => x.id === config.metric)
                    if (!selectedOption) return;
                    setTableTitleKey(selectedOption.labelKey)
                    setUnit(selectedOption.unit)
                }}
                dateFormat={chartDateFormat}
            />
            <MetricsCharts
                title={tableTitleKey}
                data={chartData}
                startDate={configs?.start ?? formatISO(startOfDay(new Date()))}
                endDate={configs?.end ?? formatISO(endOfDay(new Date()))}
                groupByPeriod={configs?.groupByPeriod ?? 'day'}
                unit={unit}
            />
        </>
    )
}

export default withAuthorization(BurokrattPage, [
    ROLES.ROLE_ADMINISTRATOR,
    ROLES.ROLE_ANALYST,
]);
