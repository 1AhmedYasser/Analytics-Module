import {
  getAvgChatWaitingTime,
  getCipChats,
  getDurationChats,
  getTotalChats,
} from '../../resources/api-constants';
import { fetchChartData, fetchChartDataWithSubOptions } from '../../util/api-response-handler';
import { chatOptions } from './options';
import {getDomainsArray} from "../../util/multiDomain-utils";
import {getShowTestData} from "../../util/testChat-utils";

export const fetchData = (config: any) => {
  config.urls = getDomainsArray();
  config.showTest = getShowTestData();

  switch (config.metric) {
    case 'total':
      return fetchChartDataWithSubOptions(getTotalChats(), config, chatOptions[0].subOptions!);
    case 'cip':
      return fetchChartDataWithSubOptions(getCipChats(), config, chatOptions[1].subOptions!);
    case 'avgConversationTime':
      return fetchChartData(getDurationChats(), config, chatOptions[2].labelKey);
    case 'avgWaitingTime':
      return fetchChartDataWithSubOptions(getAvgChatWaitingTime(), config, chatOptions[3].subOptions!);
    default:
      return [];
  }
};
