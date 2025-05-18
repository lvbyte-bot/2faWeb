import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import type { OTPAccount } from '@/types';
import * as syncService from '../services/syncService';
import * as networkService from '../services/networkService';

// 账户上下文类型
interface AccountContextType {
  accounts: OTPAccount[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  refreshAccounts: () => Promise<void>;
  getAccount: (id: string) => OTPAccount | undefined;
  createAccount: (account: Omit<OTPAccount, 'id'>) => Promise<OTPAccount>;
  updateAccount: (id: string, account: Partial<OTPAccount>) => Promise<OTPAccount>;
  deleteAccount: (id: string) => Promise<boolean>;
  importAccounts: (accounts: Omit<OTPAccount, 'id'>[]) => Promise<OTPAccount[]>;
  exportAccounts: () => Promise<OTPAccount[]>;
  syncData: () => Promise<void>;
}

// 创建账户上下文
const AccountContext = createContext<AccountContextType | undefined>(undefined);

// 账户提供者组件
export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<OTPAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline());

  // 加载账户
  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await syncService.getAllAccounts();
      setAccounts(data);
    } catch (err) {
      setError('加载账户失败');
      console.error('加载账户失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理网络状态变化
  const handleNetworkChange = (online: boolean) => {
    setIsOnline(online);

    if (online) {
      // 网络恢复时刷新数据
      loadAccounts();
    }
  };

  // 初始化
  useEffect(() => {
    // 初始化本地数据库
    syncService.initializeLocalDB()
      .then(() => loadAccounts())
      .catch(err => {
        console.error('初始化失败:', err);
        setError('初始化数据库失败');
        setLoading(false);
      });

    // 设置网络监听
    networkService.initNetworkListeners();
    networkService.registerNetworkCallback(handleNetworkChange);

    return () => {
      // 清理
      networkService.unregisterNetworkCallback(handleNetworkChange);
      networkService.removeNetworkListeners();
    };
  }, []);

  // 刷新账户
  const refreshAccounts = async () => {
    await loadAccounts();
  };

  // 获取单个账户
  const getAccount = (id: string) => {
    return accounts.find(account => account.id === id);
  };

  // 创建账户
  const createAccount = async (account: Omit<OTPAccount, 'id'>) => {
    try {
      const newAccount = await syncService.createAccount(account);
      setAccounts(prev => [...prev, newAccount]);

      notifications.show({
        title: '创建成功',
        message: '账户已成功创建',
        color: 'green',
      });

      return newAccount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建账户失败';

      notifications.show({
        title: '创建失败',
        message: errorMessage,
        color: 'red',
      });

      throw err;
    }
  };

  // 更新账户
  const updateAccount = async (id: string, accountUpdate: Partial<OTPAccount>) => {
    try {
      const updatedAccount = await syncService.updateAccount(id, accountUpdate);

      setAccounts(prev =>
        prev.map(account => account.id === id ? updatedAccount : account)
      );

      notifications.show({
        title: '更新成功',
        message: '账户已成功更新',
        color: 'green',
      });

      return updatedAccount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新账户失败';

      notifications.show({
        title: '更新失败',
        message: errorMessage,
        color: 'red',
      });

      throw err;
    }
  };

  // 删除账户
  const deleteAccount = async (id: string) => {
    try {
      const success = await syncService.deleteAccount(id);

      if (success) {
        setAccounts(prev => prev.filter(account => account.id !== id));

        notifications.show({
          title: '删除成功',
          message: '账户已成功删除',
          color: 'green',
        });
      }

      return success;
    } catch (err) {
      notifications.show({
        title: '删除失败',
        message: '删除账户失败',
        color: 'red',
      });

      return false;
    }
  };

  // 手动同步数据
  const syncData = async () => {
    if (!isOnline) {
      notifications.show({
        title: '离线模式',
        message: '当前处于离线模式，无法同步数据',
        color: 'yellow',
      });
      return;
    }

    try {
      notifications.show({
        title: '正在同步',
        message: '正在同步数据...',
        loading: true,
        autoClose: false,
        id: 'manual-sync',
      });

      await syncService.syncAccounts();
      await loadAccounts();

      notifications.update({
        id: 'manual-sync',
        title: '同步完成',
        message: '数据已成功同步',
        color: 'green',
        loading: false,
        autoClose: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '同步数据失败';

      notifications.update({
        id: 'manual-sync',
        title: '同步失败',
        message: errorMessage,
        color: 'red',
        loading: false,
        autoClose: 3000,
      });
    }
  };

  // 批量导入账户
  const importAccounts = async (accountsToImport: Omit<OTPAccount, 'id'>[]) => {
    try {
      const importedAccounts: OTPAccount[] = [];

      // 使用同步服务逐个导入账户
      for (const account of accountsToImport) {
        const newAccount = await syncService.createAccount(account);
        importedAccounts.push(newAccount);
      }

      setAccounts(prev => [...prev, ...importedAccounts]);

      notifications.show({
        title: '导入成功',
        message: `成功导入 ${importedAccounts.length} 个账户`,
        color: 'green',
      });

      return importedAccounts;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导入账户失败';

      notifications.show({
        title: '导入失败',
        message: errorMessage,
        color: 'red',
      });

      throw err;
    }
  };

  // 导出账户
  const exportAccounts = async () => {
    // 直接返回当前内存中的账户列表
    return accounts;
  };

  // 提供上下文值
  const contextValue: AccountContextType = {
    accounts,
    loading,
    error,
    isOnline,
    refreshAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    importAccounts,
    exportAccounts,
    syncData,
  };

  return (
    <AccountContext.Provider value={contextValue}>
      {children}
    </AccountContext.Provider>
  );
}

// 使用账户上下文的钩子
export function useAccounts() {
  const context = useContext(AccountContext);

  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }

  return context;
}
