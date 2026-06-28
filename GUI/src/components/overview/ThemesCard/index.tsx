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
import './styles.scss';

const COLOR = '#3D6FA8';
const TOP_N_OPTIONS = [
  { label: '3', value: '3' },
  { label: '5', value: '5' },
  { label: '10', value: '10' },
];

type Theme = { theme: string; count: number };

type Props = { range: DateRange };

const ThemesCard = ({ range }: Props) => {
  const { t } = useTranslation();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [topN, setTopN] = useState(3);

  useEffect(() => {
    let cancelled = false;
    request<any, any>({
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
      .then((result: any) => {
        if (cancelled) return;
        setThemes(result.response ?? []);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime()]);

  const total = themes.reduce((sum, theme) => sum + Number(theme.count), 0);
  const visibleThemes = themes.slice(0, topN);

  if (themes.length === 0) return null;

  return (
    <Card>
      <Track justify="between" className="overview-list-card__title">
        <span>{t('overview.themesForPeriod')}</span>
        <FormSelect
          label="top-n"
          name="themes-top-n"
          hideLabel
          options={TOP_N_OPTIONS}
          defaultValue={String(topN)}
          onSelectionChange={(selection) => selection && setTopN(Number(selection.value))}
        />
      </Track>
      <Track direction="vertical" align="stretch" gap={8} className="overview-list-card__rows">
        {visibleThemes.map((theme) => (
          <Track key={theme.theme} gap={8} className="overview-list-card__row">
            <span className="overview-list-card__row-label overview-list-card__row-label--wide">{theme.theme}</span>
            <ProgressBar value={Number(theme.count)} max={total} color={COLOR} />
            <span className="overview-list-card__row-count">{theme.count}</span>
          </Track>
        ))}
      </Track>
    </Card>
  );
};

export default ThemesCard;
