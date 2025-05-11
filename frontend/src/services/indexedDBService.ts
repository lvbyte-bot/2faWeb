import type { OTPAccount } from '@/types';

// 数据库名称和版本
const DB_NAME = '2faWebDB';
const DB_VERSION = 1;

// 存储对象名称
const ACCOUNTS_STORE = 'accounts';
const SYNC_STORE = 'syncInfo';

// 同步状态类型
export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  CONFLICT = 'conflict',
}

// 带同步信息的账户类型
export interface SyncedAccount extends OTPAccount {
  lastModified: number; // 最后修改时间戳
  syncStatus: SyncStatus; // 同步状态
}

// 打开数据库连接
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('无法打开IndexedDB数据库'));
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

// 保存账户到本地数据库
export async function saveAccount(account: SyncedAccount): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ACCOUNTS_STORE, 'readwrite');
    const store = transaction.objectStore(ACCOUNTS_STORE);

    const request = store.put(account);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`保存账户 ${account.id} 到本地数据库失败`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// 从本地数据库获取所有账户
export async function getAllLocalAccounts(): Promise<SyncedAccount[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ACCOUNTS_STORE, 'readonly');
    const store = transaction.objectStore(ACCOUNTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('从本地数据库获取账户失败'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// 从本地数据库获取单个账户
export async function getLocalAccount(id: string): Promise<SyncedAccount | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ACCOUNTS_STORE, 'readonly');
    const store = transaction.objectStore(ACCOUNTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error(`从本地数据库获取账户 ${id} 失败`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// 从本地数据库删除账户
export async function deleteLocalAccount(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ACCOUNTS_STORE, 'readwrite');
    const store = transaction.objectStore(ACCOUNTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`从本地数据库删除账户 ${id} 失败`));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// 获取待同步的账户
export async function getPendingSyncAccounts(): Promise<SyncedAccount[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ACCOUNTS_STORE, 'readonly');
    const store = transaction.objectStore(ACCOUNTS_STORE);
    const index = store.index('syncStatus');
    const request = index.getAll(SyncStatus.PENDING);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('获取待同步账户失败'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// 保存最后同步时间
export async function saveLastSyncTime(timestamp: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE, 'readwrite');
    const store = transaction.objectStore(SYNC_STORE);
    const request = store.put({ key: 'lastSyncTime', value: timestamp });

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('保存最后同步时间失败'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// 获取最后同步时间
export async function getLastSyncTime(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE, 'readonly');
    const store = transaction.objectStore(SYNC_STORE);
    const request = store.get('lastSyncTime');

    request.onsuccess = () => {
      resolve(request.result?.value || 0);
    };

    request.onerror = () => {
      reject(new Error('获取最后同步时间失败'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// 清除所有本地数据
export async function clearLocalData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ACCOUNTS_STORE, SYNC_STORE], 'readwrite');
    
    const accountsStore = transaction.objectStore(ACCOUNTS_STORE);
    const syncStore = transaction.objectStore(SYNC_STORE);
    
    accountsStore.clear();
    syncStore.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('清除本地数据失败'));
    };
  });
}
