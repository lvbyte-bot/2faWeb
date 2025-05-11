import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { groupDb } from '../models/db';
import { authMiddleware } from '../middleware/auth';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 创建路由
const groupRoutes = new Hono<{ Bindings: Bindings }>();

// 使用认证中间件保护所有路由
groupRoutes.use('*', authMiddleware);

// 分组创建验证模式
const groupSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

// 获取所有分组
groupRoutes.get('/', async (c) => {
  try {
    const user = c.get('user');
    const result = await groupDb.getGroupsByUserId(c.env.DB, user.id);
    return c.json(result.results);
  } catch (error) {
    console.error('获取分组失败:', error);
    return c.json({ error: '获取分组失败' }, 500);
  }
});

// 创建新分组
groupRoutes.post('/', zValidator('json', groupSchema), async (c) => {
  try {
    const user = c.get('user');
    const groupData = c.req.valid('json');

    const groupId = crypto.randomUUID();
    await groupDb.createGroup(c.env.DB, {
      id: groupId,
      user_id: user.id,
      name: groupData.name,
      color: groupData.color,
    });

    // 返回创建的分组
    return c.json({
      id: groupId,
      ...groupData,
    });
  } catch (error) {
    console.error('创建分组失败:', error);
    return c.json({ error: '创建分组失败' }, 500);
  }
});

// 获取单个分组
groupRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const group = await groupDb.getGroupById(c.env.DB, id, user.id);
    if (!group) {
      return c.json({ error: '分组不存在' }, 404);
    }

    return c.json(group);
  } catch (error) {
    console.error('获取分组失败:', error);
    return c.json({ error: '获取分组失败' }, 500);
  }
});

// 更新分组
groupRoutes.put('/:id', zValidator('json', groupSchema.partial()), async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const groupData = c.req.valid('json');

    // 检查分组是否存在
    const existingGroup = await groupDb.getGroupById(c.env.DB, id, user.id);
    if (!existingGroup) {
      return c.json({ error: '分组不存在' }, 404);
    }

    // 更新分组
    await groupDb.updateGroup(c.env.DB, id, user.id, groupData);

    // 获取更新后的分组
    const updatedGroup = await groupDb.getGroupById(c.env.DB, id, user.id);

    return c.json(updatedGroup);
  } catch (error) {
    console.error('更新分组失败:', error);
    return c.json({ error: '更新分组失败' }, 500);
  }
});

// 删除分组
groupRoutes.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    // 检查分组是否存在
    const existingGroup = await groupDb.getGroupById(c.env.DB, id, user.id);
    if (!existingGroup) {
      return c.json({ error: '分组不存在' }, 404);
    }

    // 删除分组（会自动将该分组下的账户的group_id设为null）
    await groupDb.deleteGroup(c.env.DB, id, user.id);

    return c.json({ success: true });
  } catch (error) {
    console.error('删除分组失败:', error);
    return c.json({ error: '删除分组失败' }, 500);
  }
});

export { groupRoutes };
