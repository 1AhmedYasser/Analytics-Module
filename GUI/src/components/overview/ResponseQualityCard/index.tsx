import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatISO } from 'date-fns';
import Card from '../../Card';
import Track from '../../Track';
import ProgressBar from '../../ProgressBar';
import { Methods, request } from '../../../util/axios-client';
import { getChatsStatuses } from '../../../resources/api-constants';
import { getDomainsArray } from '../../../util/multiDomain-utils';
import { getShowTestData } from '../../../util/testChat-utils';
import { DateRange } from '../../../util/overview-date-utils';
import './styles.scss';

const EVENT_LABEL_KEYS: Record<string, string> = {
  ACCEPTED: 'chart.accepted',
  RESPONSE_SENT_TO_CLIENT_EMAIL: 'chart.responseSentToClientEmail',
  CLIENT_LEFT_WITH_ACCEPTED: 'chart.clientLeftWithAccepted',
  CLIENT_LEFT_WITH_NO_RESOLUTION: 'chart.clientLeftWithNoResolution',
};

const COLOR = '#3D6FA8';

type Row = { event: string; count: number };

type Props = { range: DateRange };

const ResponseQualityCard = ({ range }: Props) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    request<any, any>({
      url: getChatsStatuses(),
      method: Methods.post,
      withCredentials: true,
      data: {
        metric: 'day',
        start_date: formatISO(range.start),
        end_date: formatISO(range.end),
        events: Object.keys(EVENT_LABEL_KEYS),
        urls: getDomainsArray(),
        showTest: getShowTestData(),
      },
    })
      .then((result: any) => {
        if (cancelled) return;
        const statusRows: Row[] = result.response?.[0] ?? [];
        const totals = Object.keys(EVENT_LABEL_KEYS)
          .map((event) => ({
            event,
            count: statusRows.filter((row) => row.event === event).reduce((sum, row) => sum + Number(row.count), 0),
          }))
          .sort((a, b) => b.count - a.count);
        setRows(totals);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime()]);

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (rows.length === 0) return null;

  return (
    <Card>
      <Track className="overview-list-card__title">{t('overview.responseQuality')}</Track>
      <Track direction="vertical" align="stretch" gap={8} className="overview-list-card__rows">
        {rows.map((row) => (
          <Track key={row.event} gap={8} className="overview-list-card__row">
            <span className="overview-list-card__row-label overview-list-card__row-label--wide">{t(EVENT_LABEL_KEYS[row.event])}</span>
            <ProgressBar value={row.count} max={total} color={COLOR} />
            <span className="overview-list-card__row-count">{row.count}</span>
            <span className="overview-list-card__row-percent">{total > 0 ? Math.round((row.count / total) * 100) : 0}%</span>
          </Track>
        ))}
      </Track>
    </Card>
  );
};

export default ResponseQualityCard;
