import axios, { AxiosError, AxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import { handleUnauthorizedResponse } from './unauthorized-handler';

export enum Methods {
  get = 'GET',
  post = 'POST',
  put = 'PUT',
  patch = 'PATCH',
  delete = 'DELETE',
}

const env = process.env.NODE_ENV === 'development' ? { DEBUG_ENABLED: true } : { DEBUG_ENABLED: false };
const baseURL = import.meta.env.REACT_APP_BUEROKRATT_API_URL;

const axiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
});

axiosInstance.interceptors.response.use((axiosResponse) => axiosResponse, handleUnauthorizedResponse(axiosInstance));

axiosInstance.interceptors.response.use(
  (axiosResponse) => {
    return axiosResponse;
  },
  (error: AxiosError) => {
    return Promise.reject(new Error(error.message));
  }
);

axiosInstance.interceptors.request.use(
  (axiosRequest) => {
    return axiosRequest;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized requests
    }
    if (error.response?.status === 403) {
      // Handle unauthorized requests
    }
    return Promise.reject(new Error(error.message));
  }
);

export const request = async <RequestDataType, ResponseType>({
  url,
  method = Methods.get,
  data,
  withCredentials = false,
  headers,
  responseType = 'json',
}: {
  url: string;
  method?: Methods;
  data?: RequestDataType;
  withCredentials?: boolean;
  headers?: AxiosRequestHeaders;
  responseType?: 'json' | 'arraybuffer' | 'blob' | 'document' | 'text' | 'stream';
}): Promise<ResponseType> => {
  const requestConfig: AxiosRequestConfig = {
    method: method || Methods.get,
    url,
  };

  if (data && method === Methods.get) {
    requestConfig.params = data;
  }

  if (data && method !== Methods.get) {
    requestConfig.data = data;
  }

  if (headers) {
    requestConfig.headers = headers;
  }

  if (withCredentials) {
    requestConfig.withCredentials = true;
  }

  if (responseType) {
    requestConfig.responseType = responseType;
  }

  const response = await axiosInstance(requestConfig);
  return response.data ?? response;
};
