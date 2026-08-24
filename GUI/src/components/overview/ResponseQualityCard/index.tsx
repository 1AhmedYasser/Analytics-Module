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
import { OVERVIEW_BLUE, OVERVIEW_RED } from '../../../util/overview-colors';
import { ChatsStatusesByEventResponse, ChatsStatusesRequestData, StatusEventRow } from '../../../types/overview-api';
import '../overviewSecondaryCard.scss';

const EVENT_LABEL_KEYS: Record<string, string> = {
  CLIENT_LEFT_WITH_ACCEPTED: 'chart.clientLeftWithAccepted',
  CLIENT_LEFT_WITH_NO_RESOLUTION: 'chart.clientLeftWithNoResolution',
  CLIENT_LEFT_FOR_UNKNOWN_REASONS: 'chart.clientLeftForUnknownReasons',
  ACCEPTED: 'chart.accepted',
  HATE_SPEECH: 'chart.hateSpeech',
  OTHER: 'chart.other',
  RESPONSE_SENT_TO_CLIENT_EMAIL: 'chart.responseSentToClientEmail',
};

const EVENT_ORDER = Object.keys(EVENT_LABEL_KEYS);

type Row = StatusEventRow;

type Props = {
  readonly range: DateRange;
};

const colorForEvent = (event: string) => (event === 'CLIENT_LEFT_WITH_NO_RESOLUTION' ? OVERVIEW_RED : OVERVIEW_BLUE);

const ResponseQualityCard = ({ range }: Props) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    request<ChatsStatusesRequestData, ChatsStatusesByEventResponse>({
      url: getChatsStatuses(),
      method: Methods.post,
      withCredentials: true,
      data: {
        metric: 'day',
        start_date: formatISO(range.start),
        end_date: formatISO(range.end),
        events: EVENT_ORDER,
        urls: getDomainsArray(),
        showTest: getShowTestData(),
      },
    })
      .then((result) => {
        if (cancelled) return;
        const statusRows = result.response?.[0] ?? [];
        const totals = EVENT_ORDER.map((event) => ({
          event,
          count: statusRows.filter((row) => row.event === event).reduce((sum, row) => sum + Number(row.count), 0),
        }));
        setRows(totals);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime()]);

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  const body =
    rows.length === 0 ? (
      <p className="overview-secondary-card__empty">{t('overview.noData')}</p>
    ) : (
      <Track direction="vertical" align="stretch" gap={8}>
        {rows.map((row) => (
          <Track key={row.event} gap={8} className="overview-secondary-card__row">
            <span className="overview-secondary-card__row-label overview-secondary-card__row-label--wide">
              {t(EVENT_LABEL_KEYS[row.event])}
            </span>
            <ProgressBar value={row.count} max={total} color={colorForEvent(row.event)} />
            <span className="overview-secondary-card__row-count">{row.count}</span>
            <span className="overview-secondary-card__row-percent">{total > 0 ? Math.round((row.count / total) * 100) : 0}%</span>
          </Track>
        ))}
      </Track>
    );

  return (
    <Card>
      <Track className="overview-secondary-card__header">{t('overview.responseQuality')}</Track>
      {body}
    </Card>
  );
};

export default ResponseQualityCard;
