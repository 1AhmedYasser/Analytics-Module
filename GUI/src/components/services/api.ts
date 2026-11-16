import axios, { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { handleUnauthorizedResponse } from '../../util/unauthorized-handler';

const testCookie = 'bearer ' + (localStorage.getItem('token') ?? 'test');

const api = axios.create({
  baseURL: import.meta.env.REACT_APP_BASE_API_PATH,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
  withCredentials: true,
});

const analyticsApi = axios.create({
  baseURL: import.meta.env.REACT_APP_RUUTER_V2_ANALYTICS_API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
  withCredentials: true,
});

const notificationApiDev = axios.create({
  baseURL: import.meta.env.REACT_APP_NOTIFICATION_NODE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
  withCredentials: false,
});


const authApi = axios.create({
  baseURL: import.meta.env.REACT_APP_AUTH_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
  withCredentials: true,
});

const genericApi = axios.create({
  baseURL: import.meta.env.REACT_APP_RUUTER_PRIVATE_API_URL + '/generic/',
  headers: {
    Accept: 'application/json',
    Testcookie: '',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
  withCredentials: false,
});

const ruuterApi = axios.create({
  baseURL: import.meta.env.REACT_APP_RUUTER_PRIVATE_API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
  withCredentials: true,
});

const AxiosInterceptor = ({ children }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const resInterceptor = (response: any) => {
      import.meta.env.DEBUG_ENABLED && console.debug(response);

      return response;
    }

    const errInterceptor = (error: any) => {
      import.meta.env.DEBUG_ENABLED && console.debug(error);

      let message = t('global.notificationErrorMsg');

      return Promise.reject(new Error(message));
    }

    const apiInterceptor = api.interceptors.response.use(resInterceptor, errInterceptor);
    const analyticsApiInterceptor = analyticsApi.interceptors.response.use(resInterceptor, errInterceptor);
    const authApiInterceptor = authApi.interceptors.response.use(resInterceptor, errInterceptor);
    const genericInterceptor = genericApi.interceptors.response.use(resInterceptor, errInterceptor);
    const ruuterInterceptor = ruuterApi.interceptors.response.use(resInterceptor, errInterceptor);
    const notificationApiDevInterceptor = notificationApiDev.interceptors.response.use(resInterceptor, errInterceptor);

    return () => {
      api.interceptors.response.eject(apiInterceptor);
      analyticsApi.interceptors.response.eject(analyticsApiInterceptor);
      authApi.interceptors.response.eject(authApiInterceptor);
      genericApi.interceptors.response.eject(genericInterceptor);
      ruuterApi.interceptors.response.eject(ruuterInterceptor);
      notificationApiDev.interceptors.response.eject(notificationApiDevInterceptor);
    };

  }, [t]);

  return children;
}

const handleRequestError = (error: AxiosError) => {
  import.meta.env.DEBUG_ENABLED && console.debug(error);
  return Promise.reject(new Error(error.message));
}

api.interceptors.request.use(
  (axiosRequest) => axiosRequest,
  handleRequestError
);
api.interceptors.response.use((response) => response, handleUnauthorizedResponse(api));

analyticsApi.interceptors.request.use(
  (axiosRequest) => axiosRequest,
  handleRequestError
);
analyticsApi.interceptors.response.use((response) => response, handleUnauthorizedResponse(analyticsApi));

authApi.interceptors.request.use(
  (axiosRequest) => axiosRequest,
  handleRequestError
);
authApi.interceptors.response.use((response) => response, handleUnauthorizedResponse(authApi));

genericApi.interceptors.request.use(
  (config) => {
    config.headers['Testcookie'] = testCookie;
    return config;
  },
  handleRequestError
);

ruuterApi.interceptors.request.use(
  (axiosRequest) => axiosRequest,
  handleRequestError
);
ruuterApi.interceptors.response.use((response) => response, handleUnauthorizedResponse(ruuterApi));

notificationApiDev.interceptors.request.use(
    (axiosRequest) => axiosRequest,
    handleRequestError
);

export { api, analyticsApi, authApi, genericApi, ruuterApi, notificationApiDev,AxiosInterceptor };
