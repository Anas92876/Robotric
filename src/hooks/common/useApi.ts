import { useState, useCallback } from "react";
import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { getApiUrl } from "../../utils/apiUrl";

// Get API URL (throws in production if not set)
let API_BASE_URL: string;
try {
  API_BASE_URL = getApiUrl();
} catch (error) {
  console.error('❌ [useApi] CRITICAL ERROR:', error);
  // In production, this will crash the app (intentional - fail fast)
  // In development, use fallback
  API_BASE_URL = 'http://localhost:5000';
  console.warn('⚠️ [useApi] Using development fallback:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

interface UseApiReturn {
  data: any;
  error: Error | null;
  loading: boolean;
  get: (url: string, config?: AxiosRequestConfig) => Promise<any>;
  post: (url: string, data?: any, config?: AxiosRequestConfig) => Promise<any>;
  put: (url: string, data?: any, config?: AxiosRequestConfig) => Promise<any>;
  delete: (url: string, config?: AxiosRequestConfig) => Promise<any>;
}

export function useApi(): UseApiReturn {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleRequest = useCallback(
    async (
      method: "get" | "post" | "put" | "delete",
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ) => {
      try {
        setLoading(true);
        setError(null);
        const response = await api[method](
          url,
          method === "get" ? config : data,
          config
        );
        setData(response.data);
        return response.data;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const get = useCallback(
    (url: string, config?: AxiosRequestConfig) =>
      handleRequest("get", url, undefined, config),
    [handleRequest]
  );

  const post = useCallback(
    (url: string, data?: any, config?: AxiosRequestConfig) =>
      handleRequest("post", url, data, config),
    [handleRequest]
  );

  const put = useCallback(
    (url: string, data?: any, config?: AxiosRequestConfig) =>
      handleRequest("put", url, data, config),
    [handleRequest]
  );

  const del = useCallback(
    (url: string, config?: AxiosRequestConfig) =>
      handleRequest("delete", url, undefined, config),
    [handleRequest]
  );

  return {
    data,
    error,
    loading,
    get,
    post,
    put,
    delete: del,
  };
}
