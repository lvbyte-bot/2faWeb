import { notifications } from '@mantine/notifications';
import type { OTPAccount } from '@/types';
import * as accountService from './accountService';
import * as indexedDBService from './indexedDBService';
import { SyncStatus, type SyncedAccount } from './indexedDBService';
import { startMark, endMark, printPerformanceReport } from '../utils/performance';

// 检查网络状态
export function isOnline(): boolean {
  return navigator.onLine;
}

// 将普通账户转换为带同步信息的账户
export function toSyncedAccount(account: OTPAccount, syncStatus = SyncStatus.SYNCED): SyncedAccount {
  return {
    ...account,
    lastModified: Date.now(),
    syncStatus,
  };
}

// 将带同步信息的账户转换为普通账户
export function toOTPAccount(syncedAccount: SyncedAccount): OTPAccount {
  const { lastModified, syncStatus, ...account } = syncedAccount;
  return account;
}

// 初始化本地数据库
export async function initializeLocalDB(): Promise<void> {
  const perfId = startMark('initializeLocalDB');
  try {
    // 初始化IndexedDB
    await indexedDBService.initializeIndexedDB();

    // 检查是否有本地数据
    const localAccounts = await indexedDBService.getAllLocalAccounts();

    if (localAccounts.length === 0) {
      // 如果没有本地数据，从服务器获取数据
      if (isOnline()) {
        const accounts = await accountService.getAllAccounts();

        // 将获取的账户批量保存到本地数据库
        if (accounts.length > 0) {
          const syncedAccounts = accounts.map(account => toSyncedAccount(account));
          await indexedDBService.saveAccounts(syncedAccounts);
        }

        // 保存同步时间
        await indexedDBService.saveLastSyncTime(Date.now());
      }
    }

    endMark(perfId, 'initializeLocalDB');
  } catch (error) {
    console.error('初始化本地数据库失败:', error);
    notifications.show({
      title: '初始化失败',
      message: '无法初始化本地数据库，某些功能可能不可用',
      color: 'red',
    });
    endMark(perfId, 'initializeLocalDB');
  }
}

// 获取所有账户（优先从本地获取）
export async function getAllAccounts(): Promise<OTPAccount[]> {
  const perfId = startMark('getAllAccounts');
  try {
    // 从本地数据库获取账户
    const localAccounts = await indexedDBService.getAllLocalAccounts();

    // 如果在线，尝试同步
    if (isOnline()) {
      // 在后台执行同步，不阻塞UI
      setTimeout(() => {
        syncAccounts().catch(error => {
          console.error('后台同步失败:', error);
        });
      }, 100);
    }

    // 返回本地账户（转换为普通账户）
    const accounts = localAccounts.map(toOTPAccount);
    endMark(perfId, 'getAllAccounts');
    return accounts;
  } catch (error) {
    console.error('获取账户失败:', error);

    // 如果本地获取失败，尝试从服务器获取
    if (isOnline()) {
      try {
        const accounts = await accountService.getAllAccounts();
        endMark(perfId, 'getAllAccounts');
        return accounts;
      } catch (err) {
        console.error('从服务器获取账户失败:', err);
        endMark(perfId, 'getAllAccounts');
        return [];
      }
    }

    endMark(perfId, 'getAllAccounts');
    return [];
  }
}

// 创建账户
export async function createAccount(account: Omit<OTPAccount, 'id'>): Promise<OTPAccount> {
  try {
    if (isOnline()) {
      // 如果在线，直接创建到服务器
      const newAccount = await accountService.createAccount(account);

      // 保存到本地数据库
      await indexedDBService.saveAccount(toSyncedAccount(newAccount));

      return newAccount;
    } else {
      // 如果离线，创建临时ID并保存到本地
      const tempAccount: OTPAccount = {
        ...account,
        id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      };

      // 保存到本地数据库，标记为待同步
      await indexedDBService.saveAccount(toSyncedAccount(tempAccount, SyncStatus.PENDING));

      notifications.show({
        title: '离线模式',
        message: '账户已保存到本地，将在网络恢复时同步',
        color: 'yellow',
      });

      return tempAccount;
    }
  } catch (error) {
    console.error('创建账户失败:', error);
    throw error;
  }
}

// 更新账户
export async function updateAccount(id: string, accountUpdate: Partial<OTPAccount>): Promise<OTPAccount> {
  try {
    // 获取本地账户
    const localAccount = await indexedDBService.getLocalAccount(id);

    if (!localAccount) {
      throw new Error(`账户 ${id} 不存在`);
    }

    // 更新本地账户
    const updatedAccount: SyncedAccount = {
      ...localAccount,
      ...accountUpdate,
      lastModified: Date.now(),
      syncStatus: isOnline() ? SyncStatus.SYNCED : SyncStatus.PENDING,
    };

    // 保存到本地数据库
    await indexedDBService.saveAccount(updatedAccount);

    if (isOnline()) {
      // 如果在线，同步到服务器
      try {
        await accountService.updateAccount(id, accountUpdate);
      } catch (error) {
        // 如果同步失败，标记为待同步
        updatedAccount.syncStatus = SyncStatus.PENDING;
        await indexedDBService.saveAccount(updatedAccount);

        console.error('同步更新到服务器失败:', error);
        notifications.show({
          title: '同步失败',
          message: '账户更新已保存到本地，将在稍后重试同步',
          color: 'yellow',
        });
      }
    } else {
      notifications.show({
        title: '离线模式',
        message: '账户更新已保存到本地，将在网络恢复时同步',
        color: 'yellow',
      });
    }

    return toOTPAccount(updatedAccount);
  } catch (error) {
    console.error(`更新账户 ${id} 失败:`, error);
    throw error;
  }
}

// 删除账户
export async function deleteAccount(id: string): Promise<boolean> {
  try {
    if (isOnline()) {
      // 如果在线，从服务器删除
      const success = await accountService.deleteAccount(id);

      if (success) {
        // 从本地数据库删除
        await indexedDBService.deleteLocalAccount(id);
      }

      return success;
    } else {
      // 如果离线，标记为待删除（实际上我们仍然保留在本地，但标记为待同步）
      const localAccount = await indexedDBService.getLocalAccount(id);

      if (localAccount) {
        // 我们可以添加一个特殊标记表示待删除
        // 这里简单起见，我们直接从本地删除，并在恢复在线时处理
        await indexedDBService.deleteLocalAccount(id);

        notifications.show({
          title: '离线模式',
          message: '账户已从本地删除，将在网络恢复时同步',
          color: 'yellow',
        });
      }

      return true;
    }
  } catch (error) {
    console.error(`删除账户 ${id} 失败:`, error);
    return false;
  }
}

// 同步账户
export async function syncAccounts(): Promise<void> {
  const perfId = startMark('syncAccounts');

  if (!isOnline()) {
    console.log('离线模式，跳过同步');
    endMark(perfId, 'syncAccounts');
    return;
  }

  try {
    // 获取待同步的账户
    const pendingAccounts = await indexedDBService.getPendingSyncAccounts();

    if (pendingAccounts.length === 0) {
      console.log('没有待同步的账户，检查服务器更新');

      // 获取最后同步时间
      const lastSyncTime = await indexedDBService.getLastSyncTime();

      // 从服务器获取最新账户
      const serverAccounts = await accountService.getAllAccounts();

      // 获取本地账户
      const localAccounts = await indexedDBService.getAllLocalAccounts();

      // 创建本地账户ID映射，用于快速查找
      const localAccountMap = new Map(
        localAccounts.map(account => [account.id, account])
      );

      // 需要更新的账户
      const accountsToUpdate: SyncedAccount[] = [];

      // 合并账户
      for (const serverAccount of serverAccounts) {
        const localAccount = localAccountMap.get(serverAccount.id);

        if (!localAccount) {
          // 本地没有的账户，添加到更新列表
          accountsToUpdate.push(toSyncedAccount(serverAccount));
        } else if (localAccount.syncStatus !== SyncStatus.PENDING) {
          // 如果本地账户不是待同步状态，检查是否需要更新
          accountsToUpdate.push(toSyncedAccount(serverAccount));
        }
      }

      // 批量保存账户
      if (accountsToUpdate.length > 0) {
        await indexedDBService.saveAccounts(accountsToUpdate);
        console.log(`已更新 ${accountsToUpdate.length} 个账户`);
      }

      // 保存同步时间
      await indexedDBService.saveLastSyncTime(Date.now());

      endMark(perfId, 'syncAccounts');
      return;
    }

    console.log(`开始同步 ${pendingAccounts.length} 个待同步账户`);

    // 分类账户
    const tempAccounts: SyncedAccount[] = [];
    const regularAccounts: SyncedAccount[] = [];

    pendingAccounts.forEach(account => {
      if (account.id.startsWith('temp_')) {
        tempAccounts.push(account);
      } else {
        regularAccounts.push(account);
      }
    });

    // 处理临时账户（离线创建的账户）
    const newAccounts: SyncedAccount[] = [];
    const accountsToDelete: string[] = [];

    for (const account of tempAccounts) {
      try {
        // 创建新账户到服务器
        const { id, lastModified, syncStatus, ...accountData } = account;
        const newAccount = await accountService.createAccount(accountData);

        // 添加到删除列表和新账户列表
        accountsToDelete.push(id);
        newAccounts.push(toSyncedAccount(newAccount));
      } catch (error) {
        console.error(`同步临时账户 ${account.id} 失败:`, error);
      }
    }

    // 批量删除临时账户
    for (const id of accountsToDelete) {
      await indexedDBService.deleteLocalAccount(id);
    }

    // 批量保存新账户
    if (newAccounts.length > 0) {
      await indexedDBService.saveAccounts(newAccounts);
    }

    // 处理常规账户
    const updatedAccounts: SyncedAccount[] = [];

    for (const account of regularAccounts) {
      try {
        // 更新现有账户
        const { lastModified, syncStatus, ...accountData } = account;
        await accountService.updateAccount(account.id, accountData);

        // 添加到更新列表
        updatedAccounts.push({
          ...account,
          syncStatus: SyncStatus.SYNCED,
        });
      } catch (error) {
        console.error(`同步账户 ${account.id} 失败:`, error);
      }
    }

    // 批量保存更新的账户
    if (updatedAccounts.length > 0) {
      await indexedDBService.saveAccounts(updatedAccounts);
    }

    // 更新最后同步时间
    await indexedDBService.saveLastSyncTime(Date.now());

    notifications.show({
      title: '同步完成',
      message: '账户数据已成功同步',
      color: 'green',
    });

    // 打印性能报告
    printPerformanceReport();

    endMark(perfId, 'syncAccounts');
  } catch (error) {
    console.error('同步账户失败:', error);
    notifications.show({
      title: '同步失败',
      message: '无法同步账户数据，请稍后重试',
      color: 'red',
    });
    endMark(perfId, 'syncAccounts');
  }
}
