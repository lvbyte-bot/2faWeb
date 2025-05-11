import { Context, Next } from 'hono';
import { userDb } from '../models/db';
import { verifyToken, User } from '../utils/jwt';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 扩展Context类型以包含用户信息
declare module 'hono' {
  interface ContextVariableMap {
    user: User;
  }
}

// 认证中间件
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  // 从请求头中获取Authorization
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    // 验证JWT令牌
    const user = await verifyToken(token, c.env.JWT_SECRET);

    // 检查用户是否存在
    const dbUser = await userDb.findUserById(c.env.DB, user.id);
    if (!dbUser) {
      return c.json({ error: 'Unauthorized: User not found' }, 401);
    }

    // 将用户信息添加到请求上下文中
    c.set('user', user);

    // 继续处理请求
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }
}
