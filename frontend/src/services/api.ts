import { startMark, endMark } from '../utils/performance';
import { withCache, generateCacheKey } from './apiCache';
import { withRetry, withTimeout, composeApiWrappers } from './apiRetry';

// API 基础 URL
const API_BASE_URL = '/api';

// 默认缓存时间（毫秒）
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5分钟

// 默认超时时间（毫秒）
const DEFAULT_TIMEOUT = 10000; // 10秒

/**
 * 发送GET请求
 * @param endpoint API端点
 * @param options 请求选项
 * @param useCache 是否使用缓存
 * @param cacheTTL 缓存时间（毫秒）
 * @returns 响应对象
 */
export async function get(
  endpoint: string,
  options: RequestInit = {},
  useCache = false,
  cacheTTL = DEFAULT_CACHE_TTL
) {
  const perfId = startMark(`api_get_${endpoint}`);

  const makeRequest = () => {
    const token = localStorage.getItem('token');

    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`
      };
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
      ...options,
    });
  };

  try {
    // 组合API包装器
    const wrappedRequest = composeApiWrappers(
      (fn) => withTimeout(fn, DEFAULT_TIMEOUT),
      (fn) => withRetry(fn)
    );

    // 如果使用缓存，添加缓存包装器
    if (useCache) {
      const cacheKey = generateCacheKey(endpoint, options);
      const response = await withCache(() => wrappedRequest(makeRequest), cacheKey, cacheTTL);
      endMark(perfId, `api_get_${endpoint}`);
      return response;
    } else {
      const response = await wrappedRequest(makeRequest);
      endMark(perfId, `api_get_${endpoint}`);
      return response;
    }
  } catch (error) {
    console.error(`API GET 请求失败: ${endpoint}`, error);
    endMark(perfId, `api_get_${endpoint}`);
    throw error;
  }
}

/**
 * 发送POST请求
 * @param endpoint API端点
 * @param data 请求数据
 * @param options 请求选项
 * @returns 响应对象
 */
export async function post(endpoint: string, data: any, options: RequestInit = {}) {
  const perfId = startMark(`api_post_${endpoint}`);

  const makeRequest = () => {
    const token = localStorage.getItem('token');

    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`
      };
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  };

  try {
    // 组合API包装器
    const wrappedRequest = composeApiWrappers(
      (fn) => withTimeout(fn, DEFAULT_TIMEOUT),
      (fn) => withRetry(fn)
    );

    const response = await wrappedRequest(makeRequest);
    endMark(perfId, `api_post_${endpoint}`);
    return response;
  } catch (error) {
    console.error(`API POST 请求失败: ${endpoint}`, error);
    endMark(perfId, `api_post_${endpoint}`);
    throw error;
  }
}

/**
 * 发送PUT请求
 * @param endpoint API端点
 * @param data 请求数据
 * @param options 请求选项
 * @returns 响应对象
 */
export async function put(endpoint: string, data: any, options: RequestInit = {}) {
  const perfId = startMark(`api_put_${endpoint}`);

  const makeRequest = () => {
    const token = localStorage.getItem('token');

    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`
      };
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  };

  try {
    // 组合API包装器
    const wrappedRequest = composeApiWrappers(
      (fn) => withTimeout(fn, DEFAULT_TIMEOUT),
      (fn) => withRetry(fn)
    );

    const response = await wrappedRequest(makeRequest);
    endMark(perfId, `api_put_${endpoint}`);
    return response;
  } catch (error) {
    console.error(`API PUT 请求失败: ${endpoint}`, error);
    endMark(perfId, `api_put_${endpoint}`);
    throw error;
  }
}

/**
 * 发送DELETE请求
 * @param endpoint API端点
 * @param options 请求选项
 * @returns 响应对象
 */
export async function delete_(endpoint: string, options: RequestInit = {}) {
  const perfId = startMark(`api_delete_${endpoint}`);

  const makeRequest = () => {
    const token = localStorage.getItem('token');

    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`
      };
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      ...options,
    });
  };

  try {
    // 组合API包装器
    const wrappedRequest = composeApiWrappers(
      (fn) => withTimeout(fn, DEFAULT_TIMEOUT),
      (fn) => withRetry(fn)
    );

    const response = await wrappedRequest(makeRequest);
    endMark(perfId, `api_delete_${endpoint}`);
    return response;
  } catch (error) {
    console.error(`API DELETE 请求失败: ${endpoint}`, error);
    endMark(perfId, `api_delete_${endpoint}`);
    throw error;
  }
}

/**
 * 清除API缓存
 * @param pattern 可选的键模式（正则表达式）
 */
export function clearApiCache(pattern?: RegExp): void {
  import('./apiCache').then(({ clearCache }) => {
    clearCache(pattern);
  });
}

/**
 * 获取API缓存统计信息
 * @returns 缓存统计信息
 */
export async function getApiCacheStats(): Promise<any> {
  const { getCacheStats } = await import('./apiCache');
  return getCacheStats();
}
