import { DomainSelection } from '../../types/widgetModels';
import { analyticsApi } from './api';

export async function getWidgetData(userId: string) {
  const { data } = await analyticsApi.get<DomainSelection[]>('accounts/widget-data', {
    params: {
      user_id: userId,
    },
  });
  return data;
}
