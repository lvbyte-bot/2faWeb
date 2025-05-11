import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 创建路由
const accountRoutes = new Hono<{ Bindings: Bindings }>();

// 账户创建验证模式
const accountSchema = z.object({
  name: z.string().min(1).max(100),
  issuer: z.string().min(1).max(100),
  secret: z.string().min(16),
  type: z.enum(['TOTP', 'HOTP']),
  algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']).default('SHA1'),
  digits: z.number().int().min(4).max(10).default(6),
  period: z.number().int().min(10).max(120).default(30).optional(),
  counter: z.number().int().min(0).optional(),
  group_id: z.string().uuid().optional(),
  icon: z.string().optional(),
});

// 获取所有账户
accountRoutes.get('/', async (c) => {
  // 这里将实现获取所有账户的逻辑
  return c.json({ message: 'Get all accounts endpoint (to be implemented)' }, 501);
});

// 创建新账户
accountRoutes.post('/', zValidator('json', accountSchema), async (c) => {
  // 这里将实现创建新账户的逻辑
  return c.json({ message: 'Create account endpoint (to be implemented)' }, 501);
});

// 获取单个账户
accountRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  // 这里将实现获取单个账户的逻辑
  return c.json({ message: `Get account ${id} endpoint (to be implemented)` }, 501);
});

// 更新账户
accountRoutes.put('/:id', zValidator('json', accountSchema.partial()), async (c) => {
  const id = c.req.param('id');
  // 这里将实现更新账户的逻辑
  return c.json({ message: `Update account ${id} endpoint (to be implemented)` }, 501);
});

// 删除账户
accountRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  // 这里将实现删除账户的逻辑
  return c.json({ message: `Delete account ${id} endpoint (to be implemented)` }, 501);
});

// 批量导入账户
accountRoutes.post('/import', async (c) => {
  // 这里将实现批量导入账户的逻辑
  return c.json({ message: 'Import accounts endpoint (to be implemented)' }, 501);
});

// 导出账户
accountRoutes.get('/export', async (c) => {
  // 这里将实现导出账户的逻辑
  return c.json({ message: 'Export accounts endpoint (to be implemented)' }, 501);
});

export { accountRoutes };
