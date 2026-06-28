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
import './styles.scss';

type FollowUpAction = { followUpAction: string; count: number };

type Props = { range: DateRange };

const FollowUpCard = ({ range }: Props) => {
  const { t } = useTranslation();
  const [actions, setActions] = useState<FollowUpAction[]>([]);

  useEffect(() => {
    let cancelled = false;
    request<any, any>({
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
      .then((result: any) => {
        if (cancelled) return;
        setActions((result.response ?? []).slice(0, 10));
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime()]);

  if (actions.length === 0) return null;

  return (
    <Card>
      <Track className="overview-follow-up-card__title">{t('overview.followUp')}</Track>
      <Track direction="vertical" align="stretch" gap={12} className="overview-follow-up-card__rows">
        {actions.map((action) => (
          <Track key={action.followUpAction} justify="between" className="overview-follow-up-card__row">
            <span>{action.followUpAction}</span>
            <span className="overview-follow-up-card__row-count">{action.count}</span>
          </Track>
        ))}
      </Track>
    </Card>
  );
};

export default FollowUpCard;
