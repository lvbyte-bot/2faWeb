import type { OTPAccount } from '@/types';
import { executeTransaction, executeBatchOperation, initConnectionPool } from './indexedDBPool';
import { startMark, endMark } from '../utils/performance';

// 存储对象名称
const ACCOUNTS_STORE = 'accounts';
const SYNC_STORE = 'syncInfo';

// 同步状态类型
export const SyncStatus = {
  SYNCED: 'synced',
  PENDING: 'pending',
  CONFLICT: 'conflict',
} as const;

export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];

// 带同步信息的账户类型
export interface SyncedAccount extends OTPAccount {
  lastModified: number; // 最后修改时间戳
  syncStatus: SyncStatus; // 同步状态
}

// 初始化IndexedDB
export async function initializeIndexedDB(): Promise<void> {
  const perfId = startMark('initializeIndexedDB');
  try {
    await initConnectionPool();
    endMark(perfId, 'initializeIndexedDB');
  } catch (error) {
    console.error('初始化IndexedDB失败:', error);
    endMark(perfId, 'initializeIndexedDB');
    throw error;
  }
}

// 保存账户到本地数据库
export async function saveAccount(account: SyncedAccount): Promise<void> {
  const perfId = startMark('saveAccount');
  try {
    await executeTransaction(ACCOUNTS_STORE, 'readwrite', (store) => {
      return store.put(account);
    });
    endMark(perfId, 'saveAccount');
  } catch (error) {
    console.error(`保存账户 ${account.id} 到本地数据库失败:`, error);
    endMark(perfId, 'saveAccount');
    throw new Error(`保存账户 ${account.id} 到本地数据库失败`);
  }
}

// 批量保存账户到本地数据库
export async function saveAccounts(accounts: SyncedAccount[]): Promise<void> {
  if (accounts.length === 0) return;

  const perfId = startMark('saveAccounts');
  try {
    await executeBatchOperation(ACCOUNTS_STORE, 'readwrite', (store) => {
      return accounts.map(account => store.put(account));
    });
    endMark(perfId, 'saveAccounts');
  } catch (error) {
    console.error(`批量保存 ${accounts.length} 个账户到本地数据库失败:`, error);
    endMark(perfId, 'saveAccounts');
    throw new Error(`批量保存账户到本地数据库失败`);
  }
}

// 从本地数据库获取所有账户
export async function getAllLocalAccounts(): Promise<SyncedAccount[]> {
  const perfId = startMark('getAllLocalAccounts');
  try {
    const result = await executeTransaction<SyncedAccount[]>(ACCOUNTS_STORE, 'readonly', (store) => {
      return store.getAll();
    });
    endMark(perfId, 'getAllLocalAccounts');
    return result || [];
  } catch (error) {
    console.error('从本地数据库获取所有账户失败:', error);
    endMark(perfId, 'getAllLocalAccounts');
    throw new Error('从本地数据库获取所有账户失败');
  }
}

// 从本地数据库获取单个账户
export async function getLocalAccount(id: string): Promise<SyncedAccount | null> {
  const perfId = startMark('getLocalAccount');
  try {
    const result = await executeTransaction<SyncedAccount | undefined>(ACCOUNTS_STORE, 'readonly', (store) => {
      return store.get(id);
    });
    endMark(perfId, 'getLocalAccount');
    return result || null;
  } catch (error) {
    console.error(`从本地数据库获取账户 ${id} 失败:`, error);
    endMark(perfId, 'getLocalAccount');
    throw new Error(`从本地数据库获取账户 ${id} 失败`);
  }
}

// 从本地数据库删除账户
export async function deleteLocalAccount(id: string): Promise<void> {
  const perfId = startMark('deleteLocalAccount');
  try {
    await executeTransaction(ACCOUNTS_STORE, 'readwrite', (store) => {
      return store.delete(id);
    });
    endMark(perfId, 'deleteLocalAccount');
  } catch (error) {
    console.error(`从本地数据库删除账户 ${id} 失败:`, error);
    endMark(perfId, 'deleteLocalAccount');
    throw new Error(`从本地数据库删除账户 ${id} 失败`);
  }
}

// 获取待同步的账户
export async function getPendingSyncAccounts(): Promise<SyncedAccount[]> {
  const perfId = startMark('getPendingSyncAccounts');
  try {
    const result = await executeTransaction<SyncedAccount[]>(ACCOUNTS_STORE, 'readonly', (store) => {
      const index = store.index('syncStatus');
      return index.getAll(SyncStatus.PENDING);
    });
    endMark(perfId, 'getPendingSyncAccounts');
    return result || [];
  } catch (error) {
    console.error('获取待同步账户失败:', error);
    endMark(perfId, 'getPendingSyncAccounts');
    throw new Error('获取待同步账户失败');
  }
}

// 保存最后同步时间
export async function saveLastSyncTime(timestamp: number): Promise<void> {
  const perfId = startMark('saveLastSyncTime');
  try {
    await executeTransaction(SYNC_STORE, 'readwrite', (store) => {
      return store.put({ key: 'lastSyncTime', value: timestamp });
    });
    endMark(perfId, 'saveLastSyncTime');
  } catch (error) {
    console.error('保存最后同步时间失败:', error);
    endMark(perfId, 'saveLastSyncTime');
    throw new Error('保存最后同步时间失败');
  }
}

// 获取最后同步时间
export async function getLastSyncTime(): Promise<number> {
  const perfId = startMark('getLastSyncTime');
  try {
    const result = await executeTransaction<{ key: string; value: number } | undefined>(SYNC_STORE, 'readonly', (store) => {
      return store.get('lastSyncTime');
    });
    endMark(perfId, 'getLastSyncTime');
    return result?.value || 0;
  } catch (error) {
    console.error('获取最后同步时间失败:', error);
    endMark(perfId, 'getLastSyncTime');
    throw new Error('获取最后同步时间失败');
  }
}

// 清除所有本地数据
export async function clearLocalData(): Promise<void> {
  const perfId = startMark('clearLocalData');
  try {
    // 清除账户数据
    await executeTransaction(ACCOUNTS_STORE, 'readwrite', (store) => {
      return store.clear();
    });

    // 清除同步数据
    await executeTransaction(SYNC_STORE, 'readwrite', (store) => {
      return store.clear();
    });

    endMark(perfId, 'clearLocalData');
  } catch (error) {
    console.error('清除本地数据失败:', error);
    endMark(perfId, 'clearLocalData');
    throw new Error('清除本地数据失败');
  }
}
