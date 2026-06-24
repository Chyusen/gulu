/**
 * 咕噜 Gulu — API 配置
 * 统一 baseURL、请求头、错误处理
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** 后端 API 基础地址 */
const API_BASE_URL = __DEV__
  ? 'http://localhost:8000/api/v1'  // 开发环境
  : 'https://api.gulu.app/api/v1';       // 生产环境

/** Token 存储 key */
const TOKEN_STORAGE_KEY = '@gulu/auth_token';

/** 创建 axios 实例 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,  // 30s：DeepSeek API 可能需要 10-20s
  headers: {
    'Content-Type': 'application/json',
  },
});

/** 请求拦截器：异步注入 Token */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_e) {
      // 读取 token 失败，继续无 token 请求
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** 响应拦截器：统一错误处理 + ApiResponse 解包 */
apiClient.interceptors.response.use(
  (response) => {
    const data = response.data;
    // 后端统一返回 { code, data, message }，code 为 0 时解包内部 data
    if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
      if (data.code === 0) {
        return data.data;
      }
      const err = new Error(data.message || '请求失败');
      (err as any).response = { status: 200, data };
      throw err;
    }
    return data;
  },
  (error: AxiosError<{ detail?: string }>) => {
    let message = '网络异常，请稍后重试';
    if (error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail;
      if (status === 401) {
        message = '登录已过期，请重新登录';
      } else if (status === 403) {
        message = '没有权限执行此操作';
      } else if (status === 404) {
        message = '请求的资源不存在';
      } else if (status >= 500) {
        message = '服务器开小差了，请稍后重试';
      } else if (detail) {
        message = detail;
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时，请检查网络';
    }
    console.warn('[API Error]', error.config?.url, message);
    return Promise.reject(new Error(message));
  }
);

/** Token 管理工具 */
export const tokenManager = {
  async save(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  },

  async get(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

export { apiClient, API_BASE_URL };
