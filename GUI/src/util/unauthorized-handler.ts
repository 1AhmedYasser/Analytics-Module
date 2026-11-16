import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const UNAUTHORIZED_RETRY_DELAY_MS = 1500;

type RetriableRequestConfig = InternalAxiosRequestConfig & { _unauthorizedRetried?: boolean };

let isRedirectingToLogin = false;

export const redirectToLogin = () => {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  window.location.href = import.meta.env.REACT_APP_CUSTOMER_SERVICE_LOGIN;
};

export const handleUnauthorizedResponse = (instance: AxiosInstance) => async (error: AxiosError) => {
  if (error.response?.status !== 401) return Promise.reject(error);

  const config = error.config as RetriableRequestConfig | undefined;
  if (config && !config._unauthorizedRetried && !isRedirectingToLogin) {
    config._unauthorizedRetried = true;
    await new Promise((resolve) => setTimeout(resolve, UNAUTHORIZED_RETRY_DELAY_MS));
    return instance(config);
  }

  redirectToLogin();
  return Promise.reject(error);
};
