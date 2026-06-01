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
    id: 'avgNumOfMessages',
    labelKey: 'chats.avgNumOfMessages',
    unit: t('units.messages') ?? 'messages',
  },
  {
    id: 'idle',
    labelKey: 'chats.idle',
    unit: t('units.chats') ?? 'chats',
  },
  {
    id: 'chat_forwards',
    labelKey: 'chats.chat_forwards',
    subOptions: [
      { id: 'receivedChats', labelKey: 'chats.forwards.from_csa', color: '#FFB511' },
      { id: 'forwardedChats', labelKey: 'chats.forwards.to_csa', color: '#ED7D31' },
      { id: 'forwardedExternally', labelKey: 'chats.forwards.to_other', color: '#8BB4D5' },
    ],
    unit: t('units.chats') ?? 'chats',
  },
  {
    id: 'avg_pick_time',
    labelKey: 'chats.avg_pick_time',
    unit: t('units.minutes') ?? 'minutes',
  },
  {
    id: 'avg_present_csa',
    labelKey: 'chats.avg_present_csa',
    unit: t('units.counselors') ?? 'counselors',
  },
  {
    id: 'num_chats_csa',
    labelKey: 'chats.num_chats_csa',
    unit: t('units.chats') ?? 'chats',
  },
  {
    id: 'avg_chat_time_csa',
    labelKey: 'chats.avg_chat_time_csa',
    unit: t('units.minutes') ?? 'minutes',
  },
];
