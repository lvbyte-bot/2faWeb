import type { OTPAccount } from '@/types';

// API 基础 URL
const API_BASE_URL = '/api';

// 获取认证头
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

// 处理 API 响应
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API 请求失败: ${response.status}`);
  }
  return response.json();
}

// 获取所有账户
export async function getAllAccounts(): Promise<OTPAccount[]> {
  try {
    // 检查是否有本地存储的账户（用于开发阶段）
    const localAccounts = localStorage.getItem('accounts');
    if (localAccounts) {
      return JSON.parse(localAccounts);
    }

    // 如果没有本地存储，则从 API 获取
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      headers: getAuthHeaders(),
    });

    return handleResponse<OTPAccount[]>(response);
  } catch (error) {
    console.error('获取账户失败:', error);
    // 如果 API 请求失败，返回空数组
    return [];
  }
}

// 获取单个账户
export async function getAccount(id: string): Promise<OTPAccount | null> {
  try {
    // 检查是否有本地存储的账户
    const localAccounts = localStorage.getItem('accounts');
    if (localAccounts) {
      const accounts = JSON.parse(localAccounts) as OTPAccount[];
      return accounts.find(account => account.id === id) || null;
    }

    // 如果没有本地存储，则从 API 获取
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      headers: getAuthHeaders(),
    });

    return handleResponse<OTPAccount>(response);
  } catch (error) {
    console.error(`获取账户 ${id} 失败:`, error);
    return null;
  }
}

// 创建账户
export async function createAccount(account: Omit<OTPAccount, 'id'>): Promise<OTPAccount> {
  try {
    // 检查是否有本地存储的账户
    const localAccounts = localStorage.getItem('accounts');
    if (localAccounts) {
      const accounts = JSON.parse(localAccounts) as OTPAccount[];
      const newAccount = {
        ...account,
        id: crypto.randomUUID(),
      };

      const updatedAccounts = [...accounts, newAccount];
      localStorage.setItem('accounts', JSON.stringify(updatedAccounts));

      return newAccount;
    }

    // 如果没有本地存储，则调用 API
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(account),
    });

    return handleResponse<OTPAccount>(response);
  } catch (error) {
    console.error('创建账户失败:', error);
    throw error;
  }
}

// 更新账户
export async function updateAccount(id: string, account: Partial<OTPAccount>): Promise<OTPAccount> {
  try {
    // 检查是否有本地存储的账户
    const localAccounts = localStorage.getItem('accounts');
    if (localAccounts) {
      const accounts = JSON.parse(localAccounts) as OTPAccount[];
      const accountIndex = accounts.findIndex(a => a.id === id);

      if (accountIndex === -1) {
        throw new Error(`账户 ${id} 不存在`);
      }

      const updatedAccount = {
        ...accounts[accountIndex],
        ...account,
      };

      accounts[accountIndex] = updatedAccount;
      localStorage.setItem('accounts', JSON.stringify(accounts));

      return updatedAccount;
    }

    // 如果没有本地存储，则调用 API
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(account),
    });

    return handleResponse<OTPAccount>(response);
  } catch (error) {
    console.error(`更新账户 ${id} 失败:`, error);
    throw error;
  }
}

// 删除账户
export async function deleteAccount(id: string): Promise<boolean> {
  try {
    // 检查是否有本地存储的账户
    const localAccounts = localStorage.getItem('accounts');
    if (localAccounts) {
      const accounts = JSON.parse(localAccounts) as OTPAccount[];
      const updatedAccounts = accounts.filter(account => account.id !== id);

      localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
      return true;
    }

    // 如果没有本地存储，则调用 API
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return response.ok;
  } catch (error) {
    console.error(`删除账户 ${id} 失败:`, error);
    return false;
  }
}

// 批量导入账户
export async function importAccounts(accounts: Omit<OTPAccount, 'id'>[]): Promise<OTPAccount[]> {
  try {
    // 检查是否有本地存储的账户
    const localAccounts = localStorage.getItem('accounts');
    if (localAccounts) {
      const existingAccounts = JSON.parse(localAccounts) as OTPAccount[];

      const newAccounts = accounts.map(account => ({
        ...account,
        id: crypto.randomUUID(),
      }));

      const updatedAccounts = [...existingAccounts, ...newAccounts];
      localStorage.setItem('accounts', JSON.stringify(updatedAccounts));

      return newAccounts;
    }

    // 如果没有本地存储，则调用 API
    const response = await fetch(`${API_BASE_URL}/accounts/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ accounts }),
    });

    return handleResponse<OTPAccount[]>(response);
  } catch (error) {
    console.error('导入账户失败:', error);
    throw error;
  }
}

// 导出账户
export async function exportAccounts(): Promise<OTPAccount[]> {
  try {
    // 检查是否有本地存储的账户
    const localAccounts = localStorage.getItem('accounts');
    if (localAccounts) {
      return JSON.parse(localAccounts);
    }

    // 如果没有本地存储，则从 API 获取
    const response = await fetch(`${API_BASE_URL}/accounts/export`, {
      headers: getAuthHeaders(),
    });

    return handleResponse<OTPAccount[]>(response);
  } catch (error) {
    console.error('导出账户失败:', error);
    throw error;
  }
}
