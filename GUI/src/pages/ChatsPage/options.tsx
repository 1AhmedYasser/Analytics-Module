import { t } from 'i18next';
import { Option } from '../../components/MetricAndPeriodOptions';

export const chatOptions: Option[] = [
  {
    id: 'total',
    labelKey: 'chats.total',
    subOptions: [
      { id: 'byk', labelKey: 'chats.onlyBYK', color: '#fdbf47' },
      { id: 'csa', labelKey: 'chats.csaInvolved', color: '#ed7d32' },
      { id: 'total', labelKey: 'chats.totalCount', color: '#008000' },
    ],
    unit: t('units.chats') ?? 'chats',
  },
  {
    id: 'cip',
    labelKey: 'chats.cip',
    subOptions: [
      { id: 'outside-working-hours', labelKey: 'chats.outsideWorkingHours', color: '#fdbf47' },
      { id: 'long-waiting-time', labelKey: 'chats.longWaitingTime', color: '#ed7d32' },
      { id: 'all-csas-away', labelKey: 'chats.allCsvAway', color: '#8ab4d5' },
      { id: 'total', labelKey: 'chats.totalCount', color: '#008000' },
    ],
    unit: t('units.chats') ?? 'chats',
  },
  {
    id: 'avgConversationTime',
    labelKey: 'chats.avgConversationTime',
    unit: t('units.minutes') ?? 'minutes',
  },
  {
    id: 'avgWaitingTime',
    labelKey: 'chats.avgWaitingTime',
    subOptions: [
      { id: 'avg', labelKey: 'chats.averageWaitingTime', color: '#fdbf47' },
      { id: 'median', labelKey: 'chats.medianWaitingTime', color: '#ed7d32' },
    ],
    unit: t('units.minutes') ?? 'minutes',
  },
  {
    id: 'theme_overview',
    labelKey: 'chats.theme_overview',
    unit: t('units.chats') ?? 'chats',
    defaultChartType: 'pieChart',
  },
  {
    id: 'follow_up_action_overview',
    labelKey: 'chats.follow_up_action_overview',
    unit: t('units.chats') ?? 'chats',
    defaultChartType: 'pieChart',
  },
];
