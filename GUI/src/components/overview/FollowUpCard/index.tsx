import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatISO } from 'date-fns';
import Card from '../../Card';
import Track from '../../Track';
import { Methods, request } from '../../../util/axios-client';
import { getFollowUpActionOverview } from '../../../resources/api-constants';
import { getDomainsArray } from '../../../util/multiDomain-utils';
import { getShowTestData } from '../../../util/testChat-utils';
import { DateRange } from '../../../util/overview-date-utils';
import { FollowUpActionOverviewResponse, FollowUpActionRow, OverviewDateRangeRequestData } from '../../../types/overview-api';
import '../overviewSecondaryCard.scss';

type FollowUpAction = FollowUpActionRow;

type Props = {
  readonly range: DateRange;
};

const FollowUpCard = ({ range }: Props) => {
  const { t } = useTranslation();
  const [actions, setActions] = useState<FollowUpAction[]>([]);

  useEffect(() => {
    let cancelled = false;
    request<
      OverviewDateRangeRequestData & { excluded_actions: readonly string[] },
      FollowUpActionOverviewResponse
    >({
      url: getFollowUpActionOverview(),
      method: Methods.post,
      withCredentials: true,
      data: {
        start_date: formatISO(range.start),
        end_date: formatISO(range.end),
        excluded_actions: [''],
        urls: getDomainsArray(),
        showTest: getShowTestData(),
      },
    })
      .then((result) => {
        if (cancelled) return;
        setActions([...(result.response ?? [])].slice(0, 10));
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime()]);

  const body =
    actions.length === 0 ? (
      <p className="overview-secondary-card__empty">{t('overview.noData')}</p>
    ) : (
      <Track direction="vertical" align="stretch" gap={12}>
        {actions.map((action) => (
          <Track key={action.followUpAction} justify="between" className="overview-secondary-card__follow-up-row">
            <span>{action.followUpAction}</span>
            <span className="overview-secondary-card__follow-up-count">{action.count}</span>
          </Track>
        ))}
      </Track>
    );

  return (
    <Card>
      <Track className="overview-secondary-card__header">{t('overview.followUp')}</Track>
      {body}
    </Card>
  );
};

export default FollowUpCard;
