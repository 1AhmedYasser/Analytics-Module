const baseUrl = import.meta.env.REACT_APP_RUUTER_V2_ANALYTICS_API_URL;
const ruuterUrl = import.meta.env.REACT_APP_DOCKER_RUUTER;


export const getLinkToChat = (chatId: string, startDate?: string, endDate?: string) =>
  `/chat/history?chat=${chatId}&start=${startDate}&end=${endDate}`;

export const getOpenDataValues = (lang: string): string => baseUrl + '/odp/values?lang=' + lang;

export const openDataSettings = (): string => baseUrl + '/odp/settings';
export const deleteOpenDataSettings = (): string => baseUrl + '/odp/delete-settings';

export const openDataDataset = (): string => baseUrl + '/odp/dataset';
export const getOpenDataDataset = (datasetId: string): string => baseUrl + '/odp/dataset?datasetId=' + datasetId;

export const scheduledReports = (): string => baseUrl + '/odp/scheduled-reports';
export const editScheduledReport = (): string => baseUrl + '/odp/update-scheduled-report';
export const deleteScheduledReport = (): string => baseUrl + '/odp/delete-scheduled-report';
export const uploadScheduledReport = (datasetId: string, dateTime: string): string =>
  ruuterUrl + '/odp/upload-scheduled-report?datasetId=' + datasetId + '&dateTime=' + dateTime;
export const deleteCronJobTask = (): string => baseUrl + '/odp/delete-cron-job-task';

export const downloadOpenDataXlsx = (): string => baseUrl + '/odp/download';

export const saveJsonToYaml = (): string => baseUrl + '/saveJsonToYml';

export const getTesting = (): string => {
  return baseUrl + '/testing';
};

export const overviewMetricPreferences = (): string => {
  return baseUrl + '/overview/preferences';
};

export const overviewMetrics = (): string => {
  return baseUrl + `/overview/metrics`;
};

export const geBykAvgResponseTime = (): string => {
  return baseUrl + '/bots/avg-response-speed';
};

export const getBykAvgSessionTime = (): string => {
  return baseUrl + '/bots/avg-sessions-time';
};

export const getBykIntents = (): string => {
  return baseUrl + '/bots/intents';
};

export const getBykPercentOfCorrecltyUnderstood = (): string => {
  return baseUrl + '/bots/pct-correctly-understood';
};

export const getXlsx = (): string => {
  return baseUrl + '/xlsx';
};

// Feedback

export const getChatsStatuses = (): string => {
  return baseUrl + '/chats/status';
};

export const getAverageFeedbackOnBuerokrattChats = (): string => {
  return baseUrl + '/feedbacks/avg';
};

export const getNpsFeedbackOnBuerokrattChats = (): string => {
  return baseUrl + '/feedbacks/buerokratt-chats-nps';
};

export const getNpsOnCSAChatsFeedback = (): string => {
  return baseUrl + '/feedbacks/nps';
};

export const getDistributionOnBuerokrattChatsFeedback = (): string => {
  return baseUrl + '/feedbacks/buerokratt-chats-distribution';
};

export const getDistributionOnCSAChatsFeedback = (): string => {
  return baseUrl + '/feedbacks/csa-chats-distribution';
};

export const getNpsOnSelectedCSAChatsFeedback = (): string => {
  return baseUrl + '/feedbacks/agents/nps';
};

export const getDistributionOnSelectedCSAChatsFeedback = (): string => {
  return baseUrl + '/feedbacks/agents/distribution';
};

export const getNpsAggregateOnSelectedCSAChatsFeedback = (): string => {
  return baseUrl + '/feedbacks/agents/nps-aggregate';
};

export const getNegativeFeedbackChats = (): string => {
  return baseUrl + '/feedbacks/negative';
};

// Advisors

export const getChatForwards = (): string => {
  return baseUrl + '/agents/chats/forwards';
};

export const getAvgPickTime = (): string => {
  return baseUrl + '/agents/chats/avg-time-picking-up';
};

export const getAvgCsaPresent = (): string => {
  return baseUrl + '/agents/avg-active';
};

export const getCsaChatsTotal = (): string => {
  return baseUrl + '/agents/chats/total';
};

export const getCsaAvgChatTime = (): string => {
  return baseUrl + '/agents/chats/avg-time';
};

// Chats

export const getTotalChats = (): string => {
  return baseUrl + '/chats/total-count';
};

export const getCipChats = (): string => {
  return baseUrl + '/chats/contact-information-fulfilled';
};

export const getAvgChatWaitingTime = (): string => {
  return baseUrl + '/chats/avg-median-waiting-time';
};

export const getDurationChats = (): string => {
  return baseUrl + '/chats/avg-duration';
};

export const getIdleChats = (): string => {
  return baseUrl + '/chats/idle-count';
};

export const getThemeOverview = (): string => {
  return baseUrl + '/chats/theme-overview';
};

export const getFollowUpActionOverview = (): string => {
  return baseUrl + '/chats/follow-up-action-overview';
};

export const getQualityOverview = (): string => {
  return baseUrl + '/chats/quality-overview';
};

export const getRedirectedOverview = (): string => {
  return baseUrl + '/chats/redirected-overview';
};

