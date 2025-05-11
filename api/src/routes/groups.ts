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
const groupRoutes = new Hono<{ Bindings: Bindings }>();

// 分组创建验证模式
const groupSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

// 获取所有分组
groupRoutes.get('/', async (c) => {
  // 这里将实现获取所有分组的逻辑
  return c.json({ message: 'Get all groups endpoint (to be implemented)' }, 501);
});

// 创建新分组
groupRoutes.post('/', zValidator('json', groupSchema), async (c) => {
  // 这里将实现创建新分组的逻辑
  return c.json({ message: 'Create group endpoint (to be implemented)' }, 501);
});

// 更新分组
groupRoutes.put('/:id', zValidator('json', groupSchema.partial()), async (c) => {
  const id = c.req.param('id');
  // 这里将实现更新分组的逻辑
  return c.json({ message: `Update group ${id} endpoint (to be implemented)` }, 501);
});

// 删除分组
groupRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  // 这里将实现删除分组的逻辑
  return c.json({ message: `Delete group ${id} endpoint (to be implemented)` }, 501);
});

export { groupRoutes };
