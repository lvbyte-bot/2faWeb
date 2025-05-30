import type { OTPAccount } from '@/types';
import { API_BASE_URL } from '../config';

// 获取认证头
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('未授权：缺少认证令牌');
  }
  
  // 检查token是否过期
  try {
    // 简单验证token格式 (Bearer token通常是JWT格式)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('无效的令牌格式');
    }
    
    // 解析JWT payload (第二部分)
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // 检查过期时间
    if (payload.exp && payload.exp < Date.now() / 1000) {
      // 令牌已过期，尝试刷新
      console.warn('令牌已过期，需要重新登录');
      // 触发登出流程 (这将重定向到登录页)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('会话已过期，请重新登录');
    }
  } catch (e) {
    // 如果解析失败，仍然尝试使用token (可能不是JWT格式)
    console.warn('无法验证令牌:', e);
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// 处理 API 响应
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // 检查是否是未授权错误(401)
    if (response.status === 401) {
      console.warn('会话已过期或无效，需要重新登录');
      // 清除本地存储的登录状态
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 重定向到登录页面
      window.location.href = '/login';
      // 抛出错误，但由于已经重定向，这个错误通常不会被处理
      throw new Error('会话已过期或无效，请重新登录');
    }
    
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
