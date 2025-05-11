// API 基础 URL
const API_BASE_URL = '/api';

/**
 * 发送GET请求
 * @param endpoint API端点
 * @param options 请求选项
 * @returns 响应对象
 */
export async function get(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers,
    ...options,
  });
}

/**
 * 发送POST请求
 * @param endpoint API端点
 * @param data 请求数据
 * @param options 请求选项
 * @returns 响应对象
 */
export async function post(endpoint: string, data: any, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * 发送PUT请求
 * @param endpoint API端点
 * @param data 请求数据
 * @param options 请求选项
 * @returns 响应对象
 */
export async function put(endpoint: string, data: any, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * 发送DELETE请求
 * @param endpoint API端点
 * @param options 请求选项
 * @returns 响应对象
 */
export async function delete_(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers,
    ...options,
  });
}
