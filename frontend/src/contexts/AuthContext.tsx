import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notifications } from '@mantine/notifications';

// API 基础 URL
const API_BASE_URL = '/api';

// 用户类型
interface User {
  id: string;
  username: string;
  email: string;
}

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 检查本地存储中的认证状态
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);

        // 验证令牌有效性（可选）
        validateToken(storedToken).catch(() => {
          // 如果令牌无效，清除存储并重置状态
          clearAuthState();
        });
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        clearAuthState();
      }
    }

    setIsLoading(false);
  }, []);

  // 清除认证状态
  const clearAuthState = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // 验证令牌
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      // 调用健康检查API验证令牌
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  };

  // 登录函数
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // 调用登录API
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '登录失败');
      }

      const data = await response.json();

      // 存储用户信息和令牌
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      // 更新状态
      setUser(data.user);
      setIsAuthenticated(true);

      notifications.show({
        title: '登录成功',
        message: `欢迎回来，${data.user.username}！`,
        color: 'green',
      });

      return true;
    } catch (error) {
      console.error('Login failed:', error);

      notifications.show({
        title: '登录失败',
        message: error instanceof Error ? error.message : '用户名或密码错误',
        color: 'red',
      });

      return false;
    }
  };

  // 注册函数
  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      // 调用注册API
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '注册失败');
      }

      const data = await response.json();

      // 存储用户信息和令牌
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      // 更新状态
      setUser(data.user);
      setIsAuthenticated(true);

      notifications.show({
        title: '注册成功',
        message: '您的账户已成功创建',
        color: 'green',
      });

      return true;
    } catch (error) {
      console.error('Registration failed:', error);

      notifications.show({
        title: '注册失败',
        message: error instanceof Error ? error.message : '注册过程中出现错误',
        color: 'red',
      });

      return false;
    }
  };

  // 登出函数
  const logout = async () => {
    try {
      // 调用登出API（可选）
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(err => console.error('Logout API call failed:', err));
      }
    } finally {
      // 无论API调用是否成功，都清除本地状态
      clearAuthState();

      notifications.show({
        title: '已登出',
        message: '您已成功退出登录',
        color: 'blue',
      });
    }
  };

  // 提供上下文值
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

// 使用认证上下文的钩子
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
