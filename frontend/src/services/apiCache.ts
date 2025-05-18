/**
 * API 缓存服务
 * 用于缓存 API 请求结果，减少重复请求
 */

import { startMark, endMark } from '../utils/performance';

// 缓存项类型
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// 缓存配置
interface CacheConfig {
  enabled: boolean;
  defaultTTL: number; // 默认缓存时间（毫秒）
  maxSize: number; // 最大缓存项数
}

// 默认缓存配置
const defaultConfig: CacheConfig = {
  enabled: true,
  defaultTTL: 5 * 60 * 1000, // 5分钟
  maxSize: 100,
};

// 缓存存储
const cache = new Map<string, CacheItem<any>>();

// 当前配置
let currentConfig = { ...defaultConfig };

/**
 * 设置缓存配置
 * @param config 缓存配置
 */
export function setCacheConfig(config: Partial<CacheConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 获取缓存配置
 * @returns 当前缓存配置
 */
export function getCacheConfig(): CacheConfig {
  return { ...currentConfig };
}

/**
 * 生成缓存键
 * @param endpoint API端点
 * @param params 请求参数
 * @returns 缓存键
 */
export function generateCacheKey(endpoint: string, params?: any): string {
  if (!params) {
    return endpoint;
  }
  
  const sortedParams = typeof params === 'object'
    ? JSON.stringify(params, Object.keys(params).sort())
    : String(params);
  
  return `${endpoint}:${sortedParams}`;
}

/**
 * 从缓存获取数据
 * @param key 缓存键
 * @returns 缓存数据或undefined
 */
export function getFromCache<T>(key: string): T | undefined {
  const perfId = startMark('getFromCache');
  
  try {
    const item = cache.get(key);
    
    // 如果没有缓存项或缓存已过期，返回undefined
    if (!item || Date.now() > item.expiresAt) {
      if (item) {
        // 如果缓存已过期，删除它
        cache.delete(key);
      }
      
      endMark(perfId, 'getFromCache');
      return undefined;
    }
    
    endMark(perfId, 'getFromCache');
    return item.data;
  } catch (error) {
    console.error('从缓存获取数据失败:', error);
    endMark(perfId, 'getFromCache');
    return undefined;
  }
}

/**
 * 将数据存入缓存
 * @param key 缓存键
 * @param data 数据
 * @param ttl 缓存时间（毫秒）
 */
export function setToCache<T>(key: string, data: T, ttl = currentConfig.defaultTTL): void {
  const perfId = startMark('setToCache');
  
  try {
    // 如果缓存已满，删除最旧的项
    if (cache.size >= currentConfig.maxSize) {
      const oldestKey = findOldestCacheKey();
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
    
    // 存入缓存
    cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
    
    endMark(perfId, 'setToCache');
  } catch (error) {
    console.error('存入缓存失败:', error);
    endMark(perfId, 'setToCache');
  }
}

/**
 * 清除缓存
 * @param pattern 可选的键模式（正则表达式）
 */
export function clearCache(pattern?: RegExp): void {
  const perfId = startMark('clearCache');
  
  if (!pattern) {
    // 清除所有缓存
    cache.clear();
  } else {
    // 清除匹配模式的缓存
    for (const key of cache.keys()) {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    }
  }
  
  endMark(perfId, 'clearCache');
}

/**
 * 查找最旧的缓存键
 * @returns 最旧的缓存键
 */
function findOldestCacheKey(): string | undefined {
  let oldestKey: string | undefined;
  let oldestTimestamp = Infinity;
  
  for (const [key, item] of cache.entries()) {
    if (item.timestamp < oldestTimestamp) {
      oldestTimestamp = item.timestamp;
      oldestKey = key;
    }
  }
  
  return oldestKey;
}

/**
 * 获取缓存统计信息
 * @returns 缓存统计信息
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  enabled: boolean;
  hitCount: number;
  missCount: number;
} {
  return {
    size: cache.size,
    maxSize: currentConfig.maxSize,
    enabled: currentConfig.enabled,
    hitCount: 0, // 这里可以添加命中计数
    missCount: 0, // 这里可以添加未命中计数
  };
}

/**
 * 使用缓存包装API调用
 * @param fn API调用函数
 * @param key 缓存键
 * @param ttl 缓存时间（毫秒）
 * @returns API调用结果
 */
export async function withCache<T>(
  fn: () => Promise<T>,
  key: string,
  ttl = currentConfig.defaultTTL
): Promise<T> {
  // 如果缓存禁用，直接调用函数
  if (!currentConfig.enabled) {
    return fn();
  }
  
  // 尝试从缓存获取
  const cachedData = getFromCache<T>(key);
  if (cachedData !== undefined) {
    return cachedData;
  }
  
  // 调用函数获取新数据
  const data = await fn();
  
  // 存入缓存
  setToCache(key, data, ttl);
  
  return data;
}
