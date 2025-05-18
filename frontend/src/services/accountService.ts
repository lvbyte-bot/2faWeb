import type { OTPAccount } from '@/types';

// API 基础 URL
const API_BASE_URL = '/api';

// 获取认证头
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('未授权：缺少认证令牌');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// 处理 API 响应
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    try {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `API 请求失败: ${response.status}`;
      console.error('API错误详情:', errorData);
      throw new Error(errorMessage);
    } catch (error) {
      // 确保我们总是抛出一个Error对象，而不是其他类型
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`API 请求失败: ${response.status}`);
      }
    }
  }
  return response.json();
}

// 获取所有账户
export async function getAllAccounts(): Promise<OTPAccount[]> {
  try {
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
    console.log('开始导入账户，数量:', accounts.length);

    // 检查账户数据是否有效
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('没有有效的账户数据可导入');
    }

    // 检查每个账户是否有必要的字段
    for (const account of accounts) {
      if (!account.name || !account.secret) {
        console.error('无效的账户数据:', account);
        throw new Error('账户数据缺少必要的字段（名称或密钥）');
      }
    }

    const response = await fetch(`${API_BASE_URL}/accounts/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ accounts }),
    });

    return handleResponse<OTPAccount[]>(response);
  } catch (error) {
    console.error('导入账户失败:', error);
    // 确保我们总是抛出一个Error对象，而不是其他类型
    if (error instanceof Error) {
      throw error;
    } else if (typeof error === 'object' && error !== null) {
      throw new Error(JSON.stringify(error));
    } else {
      throw new Error('导入账户时发生未知错误');
    }
  }
}

// 导出账户
export async function exportAccounts(): Promise<OTPAccount[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/accounts/export`, {
      headers: getAuthHeaders(),
    });

    return handleResponse<OTPAccount[]>(response);
  } catch (error) {
    console.error('导出账户失败:', error);
    throw error;
  }
}
