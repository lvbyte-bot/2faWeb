/**
 * IndexedDB 连接池管理
 * 用于优化 IndexedDB 连接，避免频繁打开和关闭连接
 */

// 数据库名称和版本
const DB_NAME = '2faWebDB';
const DB_VERSION = 1;

// 存储对象名称
const ACCOUNTS_STORE = 'accounts';
const SYNC_STORE = 'syncInfo';

// 连接池大小
const POOL_SIZE = 3;

// 连接池
let connectionPool: IDBDatabase[] = [];
let isInitialized = false;

// 初始化连接池
export async function initConnectionPool(): Promise<void> {
  if (isInitialized) return;
  
  try {
    // 创建连接池
    const connections = await Promise.all(
      Array(POOL_SIZE).fill(0).map(() => openDatabase())
    );
    
    connectionPool = connections;
    isInitialized = true;
    
    console.log(`IndexedDB 连接池已初始化，大小: ${connectionPool.length}`);
  } catch (error) {
    console.error('初始化 IndexedDB 连接池失败:', error);
    throw error;
  }
}

// 获取连接
export async function getConnection(): Promise<IDBDatabase> {
  if (!isInitialized) {
    await initConnectionPool();
  }
  
  // 如果有可用连接，返回第一个
  if (connectionPool.length > 0) {
    return connectionPool.shift()!;
  }
  
  // 如果没有可用连接，创建新连接
  return openDatabase();
}

// 释放连接
export function releaseConnection(connection: IDBDatabase): void {
  // 如果连接池未满，将连接放回池中
  if (connectionPool.length < POOL_SIZE) {
    connectionPool.push(connection);
  } else {
    // 如果连接池已满，关闭连接
    connection.close();
  }
}

// 关闭所有连接
export function closeAllConnections(): void {
  connectionPool.forEach(connection => {
    connection.close();
  });
  
  connectionPool = [];
  isInitialized = false;
}

// 打开数据库连接
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      reject(new Error('无法打开 IndexedDB 数据库'));
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // 创建账户存储
      if (!db.objectStoreNames.contains(ACCOUNTS_STORE)) {
        const accountStore = db.createObjectStore(ACCOUNTS_STORE, { keyPath: 'id' });
        accountStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        accountStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
      
      // 创建同步信息存储
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        const syncStore = db.createObjectStore(SYNC_STORE, { keyPath: 'key' });
      }
    };
  });
}

// 执行数据库操作
export async function executeTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const connection = await getConnection();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = connection.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      const request = operation(store);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(new Error(`IndexedDB 操作失败: ${request.error?.message}`));
      };
      
      transaction.oncomplete = () => {
        releaseConnection(connection);
      };
      
      transaction.onerror = () => {
        releaseConnection(connection);
        reject(new Error(`IndexedDB 事务失败: ${transaction.error?.message}`));
      };
      
      transaction.onabort = () => {
        releaseConnection(connection);
        reject(new Error('IndexedDB 事务已中止'));
      };
    } catch (error) {
      releaseConnection(connection);
      reject(error);
    }
  });
}

// 执行批量操作
export async function executeBatchOperation<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operations: (store: IDBObjectStore) => IDBRequest<T>[]
): Promise<T[]> {
  const connection = await getConnection();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = connection.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      const requests = operations(store);
      const results: T[] = [];
      
      requests.forEach((request, index) => {
        request.onsuccess = () => {
          results[index] = request.result;
        };
        
        request.onerror = () => {
          console.error(`批量操作中的第 ${index} 个操作失败:`, request.error);
        };
      });
      
      transaction.oncomplete = () => {
        releaseConnection(connection);
        resolve(results);
      };
      
      transaction.onerror = () => {
        releaseConnection(connection);
        reject(new Error(`IndexedDB 批量操作事务失败: ${transaction.error?.message}`));
      };
      
      transaction.onabort = () => {
        releaseConnection(connection);
        reject(new Error('IndexedDB 批量操作事务已中止'));
      };
    } catch (error) {
      releaseConnection(connection);
      reject(error);
    }
  });
}
