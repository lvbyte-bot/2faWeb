import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notifications } from '@mantine/notifications';

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
  
  // 检查本地存储中的认证状态
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);
  
  // 登录函数
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // 在实际应用中，这里应该调用API进行认证
      // 目前使用模拟数据进行演示
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟成功登录
      const mockUser = {
        id: '1',
        username,
        email: `${username}@example.com`,
      };
      
      const mockToken = 'mock-jwt-token';
      
      // 存储用户信息和令牌
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', mockToken);
      
      // 更新状态
      setUser(mockUser);
      setIsAuthenticated(true);
      
      notifications.show({
        title: '登录成功',
        message: `欢迎回来，${username}！`,
        color: 'green',
      });
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      
      notifications.show({
        title: '登录失败',
        message: '用户名或密码错误',
        color: 'red',
      });
      
      return false;
    }
  };
  
  // 注册函数
  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      // 在实际应用中，这里应该调用API进行注册
      // 目前使用模拟数据进行演示
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟成功注册
      const mockUser = {
        id: '1',
        username,
        email,
      };
      
      const mockToken = 'mock-jwt-token';
      
      // 存储用户信息和令牌
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', mockToken);
      
      // 更新状态
      setUser(mockUser);
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
        message: '注册过程中出现错误',
        color: 'red',
      });
      
      return false;
    }
  };
  
  // 登出函数
  const logout = () => {
    // 清除本地存储
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // 更新状态
    setUser(null);
    setIsAuthenticated(false);
    
    notifications.show({
      title: '已登出',
      message: '您已成功退出登录',
      color: 'blue',
    });
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
      {children}
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
