/**
 * API 重试服务
 * 用于在 API 请求失败时自动重试
 */

import { startMark, endMark } from '../utils/performance';

// 重试配置
interface RetryConfig {
  maxRetries: number; // 最大重试次数
  initialDelay: number; // 初始延迟（毫秒）
  maxDelay: number; // 最大延迟（毫秒）
  backoffFactor: number; // 退避因子
  retryableStatusCodes: number[]; // 可重试的状态码
}

// 默认重试配置
const defaultConfig: RetryConfig = {
  maxRetries: 3,
  initialDelay: 300,
  maxDelay: 5000,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// 当前配置
let currentConfig = { ...defaultConfig };

/**
 * 设置重试配置
 * @param config 重试配置
 */
export function setRetryConfig(config: Partial<RetryConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 获取重试配置
 * @returns 当前重试配置
 */
export function getRetryConfig(): RetryConfig {
  return { ...currentConfig };
}

/**
 * 延迟指定时间
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算重试延迟时间
 * @param retryCount 当前重试次数
 * @returns 延迟时间（毫秒）
 */
function calculateDelay(retryCount: number): number {
  const { initialDelay, maxDelay, backoffFactor } = currentConfig;
  
  // 指数退避策略
  const exponentialDelay = initialDelay * Math.pow(backoffFactor, retryCount);
  
  // 添加随机抖动（±20%）
  const jitter = 0.8 + Math.random() * 0.4;
  
  // 确保不超过最大延迟
  return Math.min(exponentialDelay * jitter, maxDelay);
}

/**
 * 判断是否应该重试
 * @param error 错误对象
 * @returns 是否应该重试
 */
function shouldRetry(error: any): boolean {
  // 网络错误应该重试
  if (error.name === 'TypeError' && error.message.includes('Network')) {
    return true;
  }
  
  // 超时错误应该重试
  if (error.name === 'TimeoutError') {
    return true;
  }
  
  // 检查状态码
  if (error.status && currentConfig.retryableStatusCodes.includes(error.status)) {
    return true;
  }
  
  // 检查响应对象
  if (error.response && currentConfig.retryableStatusCodes.includes(error.response.status)) {
    return true;
  }
  
  return false;
}

/**
 * 使用重试机制包装API调用
 * @param fn API调用函数
 * @param options 重试选项
 * @returns API调用结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryConfig> = {}
): Promise<T> {
  const perfId = startMark('withRetry');
  const config = { ...currentConfig, ...options };
  let retryCount = 0;
  
  while (true) {
    try {
      const result = await fn();
      endMark(perfId, 'withRetry');
      return result;
    } catch (error) {
      if (retryCount >= config.maxRetries || !shouldRetry(error)) {
        endMark(perfId, 'withRetry');
        throw error;
      }
      
      // 计算延迟时间
      const delayTime = calculateDelay(retryCount);
      
      console.warn(`API调用失败，将在 ${delayTime}ms 后重试 (${retryCount + 1}/${config.maxRetries})`, error);
      
      // 等待延迟时间
      await delay(delayTime);
      
      // 增加重试计数
      retryCount++;
    }
  }
}

/**
 * 使用超时包装API调用
 * @param fn API调用函数
 * @param timeoutMs 超时时间（毫秒）
 * @returns API调用结果
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  const perfId = startMark('withTimeout');
  
  // 创建超时Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const error = new Error(`API调用超时 (${timeoutMs}ms)`);
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs);
  });
  
  try {
    // 竞争API调用和超时
    const result = await Promise.race([fn(), timeoutPromise]);
    endMark(perfId, 'withTimeout');
    return result;
  } catch (error) {
    endMark(perfId, 'withTimeout');
    throw error;
  }
}

/**
 * 组合多个API包装器
 * @param wrappers API包装器数组
 * @returns 组合后的API包装器
 */
export function composeApiWrappers<T>(
  ...wrappers: Array<(fn: () => Promise<T>) => Promise<T>>
): (fn: () => Promise<T>) => Promise<T> {
  return (fn: () => Promise<T>) => {
    return wrappers.reduceRight((acc, wrapper) => {
      return () => wrapper(acc);
    }, fn)();
  };
}
