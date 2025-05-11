import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import type { OTPAccount } from '@/types';
import * as accountService from '../services/accountService';

// 账户上下文类型
interface AccountContextType {
  accounts: OTPAccount[];
  loading: boolean;
  error: string | null;
  refreshAccounts: () => Promise<void>;
  getAccount: (id: string) => OTPAccount | undefined;
  createAccount: (account: Omit<OTPAccount, 'id'>) => Promise<OTPAccount>;
  updateAccount: (id: string, account: Partial<OTPAccount>) => Promise<OTPAccount>;
  deleteAccount: (id: string) => Promise<boolean>;
  importAccounts: (accounts: Omit<OTPAccount, 'id'>[]) => Promise<OTPAccount[]>;
  exportAccounts: () => Promise<OTPAccount[]>;
}

// 创建账户上下文
const AccountContext = createContext<AccountContextType | undefined>(undefined);

// 账户提供者组件
export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<OTPAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 加载账户
  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountService.getAllAccounts();
      setAccounts(data);
    } catch (err) {
      setError('加载账户失败');
      console.error('加载账户失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadAccounts();
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
      const newAccount = await accountService.createAccount(account);
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
      const updatedAccount = await accountService.updateAccount(id, accountUpdate);

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
      const success = await accountService.deleteAccount(id);

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

  // 批量导入账户
  const importAccounts = async (accountsToImport: Omit<OTPAccount, 'id'>[]) => {
    try {
      const importedAccounts = await accountService.importAccounts(accountsToImport);

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
    try {
      return await accountService.exportAccounts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出账户失败';

      notifications.show({
        title: '导出失败',
        message: errorMessage,
        color: 'red',
      });

      throw err;
    }
  };

  // 提供上下文值
  const contextValue: AccountContextType = {
    accounts,
    loading,
    error,
    refreshAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    importAccounts,
    exportAccounts,
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
