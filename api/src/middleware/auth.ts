import { Context, Next } from 'hono';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 认证中间件
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  // 从请求头中获取Authorization
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
  }

  const token = authHeader.substring(7);
  
  try {
    // 这里将实现JWT验证逻辑
    // 暂时返回未实现状态
    return c.json({ error: 'Authentication not implemented yet' }, 501);
    
    // 验证成功后，将用户信息添加到请求上下文中
    // c.set('user', { id: 'user_id', username: 'username' });
    // await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }
}
