import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { userDb } from '../models/db';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 创建路由
const authRoutes = new Hono<{ Bindings: Bindings }>();

// 注册用户验证模式
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  email: z.string().email(),
});

// 登录验证模式
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// 注册路由
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, password, email } = c.req.valid('json');

  try {
    // 检查用户名是否已存在
    const existingUser = await userDb.findUserByUsername(c.env.DB, username);
    if (existingUser) {
      return c.json({ error: '用户名已存在' }, 400);
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const userId = crypto.randomUUID();
    await userDb.createUser(c.env.DB, {
      id: userId,
      username,
      password_hash: passwordHash,
      email,
    });

    // 生成JWT令牌
    const token = await generateToken(
      { id: userId, username, email },
      c.env.JWT_SECRET
    );

    return c.json({
      message: '注册成功',
      user: { id: userId, username, email },
      token,
    });
  } catch (error) {
    console.error('注册失败:', error);
    return c.json({ error: '注册失败，请稍后重试' }, 500);
  }
});

// 登录路由
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');

  try {
    // 查找用户
    const user = await userDb.findUserByUsername(c.env.DB, username);
    if (!user) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    // 更新最后登录时间
    await userDb.updateLastLogin(c.env.DB, user.id);

    // 生成JWT令牌
    const token = await generateToken(
      { id: user.id, username: user.username, email: user.email },
      c.env.JWT_SECRET
    );

    return c.json({
      message: '登录成功',
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  } catch (error) {
    console.error('登录失败:', error);
    return c.json({ error: '登录失败，请稍后重试' }, 500);
  }
});

// 登出路由 - 客户端只需要删除本地存储的令牌
authRoutes.post('/logout', async (c) => {
  return c.json({ message: '登出成功' });
});

// 获取当前用户信息
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// WebAuthn注册路由 - 暂不实现
authRoutes.post('/webauthn/register', async (c) => {
  return c.json({ message: 'WebAuthn registration endpoint (to be implemented)' }, 501);
});

// WebAuthn登录路由 - 暂不实现
authRoutes.post('/webauthn/login', async (c) => {
  return c.json({ message: 'WebAuthn login endpoint (to be implemented)' }, 501);
});

export { authRoutes };
