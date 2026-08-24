import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatISO } from 'date-fns';
import Card from '../../Card';
import Track from '../../Track';
import ProgressBar from '../../ProgressBar';
import { FormSelect } from '../../FormElements';
import { Methods, request } from '../../../util/axios-client';
import { getThemeOverview } from '../../../resources/api-constants';
import { getDomainsArray } from '../../../util/multiDomain-utils';
import { getShowTestData } from '../../../util/testChat-utils';
import { DateRange } from '../../../util/overview-date-utils';
import { OVERVIEW_BLUE } from '../../../util/overview-colors';
import { OverviewDateRangeRequestData, ThemeOverviewResponse, ThemeOverviewRow } from '../../../types/overview-api';
import '../overviewSecondaryCard.scss';

const TOP_N_OPTIONS = [
  { label: '3', value: '3' },
  { label: '5', value: '5' },
  { label: '10', value: '10' },
];

type Theme = ThemeOverviewRow;

type Props = {
  readonly range: DateRange;
};

const ThemesCard = ({ range }: Props) => {
  const { t } = useTranslation();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [topN, setTopN] = useState(3);

  useEffect(() => {
    let cancelled = false;
    request<
      OverviewDateRangeRequestData & { excluded_themes: readonly string[] },
      ThemeOverviewResponse
    >({
      url: getThemeOverview(),
      method: Methods.post,
      withCredentials: true,
      data: {
        start_date: formatISO(range.start),
        end_date: formatISO(range.end),
        excluded_themes: [''],
        urls: getDomainsArray(),
        showTest: getShowTestData(),
      },
    })
      .then((result) => {
        if (cancelled) return;
        setThemes([...(result.response?.[0] ?? [])]);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime()]);

  const total = themes.reduce((sum, theme) => sum + Number(theme.count), 0);
  const visibleThemes = themes.slice(0, topN);

  const body =
    themes.length === 0 ? (
      <p className="overview-secondary-card__empty">{t('overview.noData')}</p>
    ) : (
      <Track direction="vertical" align="stretch" gap={8}>
        {visibleThemes.map((theme) => (
          <Track key={theme.theme} gap={8} className="overview-secondary-card__row">
            <span className="overview-secondary-card__row-label overview-secondary-card__row-label--wide overview-secondary-card__row-label--muted">{theme.theme}</span>
            <ProgressBar value={Number(theme.count)} max={total} color={OVERVIEW_BLUE} />
            <span className="overview-secondary-card__row-count">{theme.count}</span>
            <span className="overview-secondary-card__row-percent">
              {total > 0 ? Math.round((Number(theme.count) / total) * 100) : 0}%
            </span>
          </Track>
        ))}
      </Track>
    );

  return (
    <Card>
      <Track justify="between" className="overview-secondary-card__header">
        <span>{t('overview.themesForPeriod')}</span>
        <div className="overview-secondary-card__top-n-select">
          <FormSelect
            label="top-n"
            name="themes-top-n"
            hideLabel
            options={TOP_N_OPTIONS}
            defaultValue={String(topN)}
            onSelectionChange={(selection) => selection && setTopN(Number(selection.value))}
          />
        </div>
      </Track>
      {body}
    </Card>
  );
};

export default ThemesCard;
