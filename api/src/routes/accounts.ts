import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { accountDb } from '../models/db';
import { authMiddleware } from '../middleware/auth';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 创建路由
const accountRoutes = new Hono<{ Bindings: Bindings }>();

// 使用认证中间件保护所有路由
accountRoutes.use('*', authMiddleware);

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

// 批量导入验证模式
const importSchema = z.object({
  accounts: z.array(accountSchema),
});

// 获取所有账户
accountRoutes.get('/', async (c) => {
  try {
    const user = c.get('user');
    const result = await accountDb.getAccountsByUserId(c.env.DB, user.id);

    // 将group_id转换为groupId以匹配前端类型
    const accounts = result.results.map(account => ({
      ...account,
      groupId: account.group_id,
      group_id: undefined,
    }));

    return c.json(accounts);
  } catch (error) {
    console.error('获取账户失败:', error);
    return c.json({ error: '获取账户失败' }, 500);
  }
});

// 创建新账户
accountRoutes.post('/', zValidator('json', accountSchema), async (c) => {
  try {
    const user = c.get('user');
    const accountData = c.req.valid('json');

    const accountId = crypto.randomUUID();
    await accountDb.createAccount(c.env.DB, {
      id: accountId,
      user_id: user.id,
      name: accountData.name,
      issuer: accountData.issuer,
      secret: accountData.secret,
      type: accountData.type,
      algorithm: accountData.algorithm,
      digits: accountData.digits,
      period: accountData.period,
      counter: accountData.counter,
      group_id: accountData.group_id,
      icon: accountData.icon,
    });

    // 返回创建的账户
    return c.json({
      id: accountId,
      ...accountData,
      groupId: accountData.group_id,
      group_id: undefined,
    });
  } catch (error) {
    console.error('创建账户失败:', error);
    return c.json({ error: '创建账户失败' }, 500);
  }
});

// 获取单个账户
accountRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const account = await accountDb.getAccountById(c.env.DB, id, user.id);
    if (!account) {
      return c.json({ error: '账户不存在' }, 404);
    }

    // 将group_id转换为groupId以匹配前端类型
    return c.json({
      ...account,
      groupId: account.group_id,
      group_id: undefined,
    });
  } catch (error) {
    console.error('获取账户失败:', error);
    return c.json({ error: '获取账户失败' }, 500);
  }
});

// 更新账户
accountRoutes.put('/:id', zValidator('json', accountSchema.partial()), async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const accountData = c.req.valid('json');

    // 检查账户是否存在
    const existingAccount = await accountDb.getAccountById(c.env.DB, id, user.id);
    if (!existingAccount) {
      return c.json({ error: '账户不存在' }, 404);
    }

    // 更新账户
    await accountDb.updateAccount(c.env.DB, id, user.id, accountData);

    // 获取更新后的账户
    const updatedAccount = await accountDb.getAccountById(c.env.DB, id, user.id);

    // 将group_id转换为groupId以匹配前端类型
    return c.json({
      ...updatedAccount,
      groupId: updatedAccount.group_id,
      group_id: undefined,
    });
  } catch (error) {
    console.error('更新账户失败:', error);
    return c.json({ error: '更新账户失败' }, 500);
  }
});

// 删除账户
accountRoutes.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    // 检查账户是否存在
    const existingAccount = await accountDb.getAccountById(c.env.DB, id, user.id);
    if (!existingAccount) {
      return c.json({ error: '账户不存在' }, 404);
    }

    // 删除账户
    await accountDb.deleteAccount(c.env.DB, id, user.id);

    return c.json({ success: true });
  } catch (error) {
    console.error('删除账户失败:', error);
    return c.json({ error: '删除账户失败' }, 500);
  }
});

// 批量导入账户
accountRoutes.post('/import', zValidator('json', importSchema), async (c) => {
  try {
    const user = c.get('user');
    const { accounts: accountsData } = c.req.valid('json');

    // 为每个账户生成ID并添加用户ID
    const accounts = accountsData.map(account => ({
      ...account,
      id: crypto.randomUUID(),
      user_id: user.id,
    }));

    // 批量导入账户
    await accountDb.importAccounts(c.env.DB, accounts);

    // 返回导入的账户，转换group_id为groupId
    const importedAccounts = accounts.map(account => ({
      ...account,
      groupId: account.group_id,
      group_id: undefined,
      user_id: undefined,
    }));

    return c.json(importedAccounts);
  } catch (error) {
    console.error('导入账户失败:', error);
    return c.json({ error: '导入账户失败' }, 500);
  }
});

// 导出账户
accountRoutes.get('/export', async (c) => {
  try {
    const user = c.get('user');
    const result = await accountDb.getAccountsByUserId(c.env.DB, user.id);

    // 将group_id转换为groupId以匹配前端类型，并移除不需要的字段
    const accounts = result.results.map(account => ({
      name: account.name,
      issuer: account.issuer,
      secret: account.secret,
      type: account.type,
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
      counter: account.counter,
      groupId: account.group_id,
      icon: account.icon,
    }));

    return c.json(accounts);
  } catch (error) {
    console.error('导出账户失败:', error);
    return c.json({ error: '导出账户失败' }, 500);
  }
});

export { accountRoutes };
