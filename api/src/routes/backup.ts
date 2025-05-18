import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { accountDb, groupDb, userDb } from '../models/db';
import { authMiddleware } from '../middleware/auth';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 创建路由
const backupRoutes = new Hono<{ Bindings: Bindings }>();

// 应用认证中间件
backupRoutes.use('*', authMiddleware);

// 备份数据验证模式
const restoreSchema = z.object({
  backup: z.object({
    accounts: z.array(z.object({
      id: z.string().optional(),
      name: z.string(),
      issuer: z.string().optional().nullable(),
      secret: z.string(),
      type: z.enum(['TOTP', 'HOTP']),
      algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']).optional().nullable(),
      digits: z.number().optional().nullable(),
      period: z.number().optional().nullable(),
      counter: z.union([z.number(), z.null()]).optional(),
      groupId: z.string().optional().nullable(),
      icon: z.string().optional().nullable(),
    }).passthrough()).nonempty(), // 至少需要一个账户
    groups: z.array(z.object({
      id: z.string().optional(),
      name: z.string(),
      color: z.string().optional().nullable(),
    }).passthrough()).optional().default([]),
    settings: z.record(z.any()).optional().default({}),
    version: z.string(),
    timestamp: z.number(),
  }).passthrough(), // 允许额外的字段
  options: z.object({
    overwriteExisting: z.boolean().optional().default(false),
    mergeSettings: z.boolean().optional().default(true),
  }).optional().default({}), // 提供默认值
});

// 创建完整备份
backupRoutes.get('/create', async (c) => {
  try {
    const user = c.get('user');

    // 获取用户账户
    const accountsResult = await accountDb.getAccountsByUserId(c.env.DB, user.id);
    const accounts = accountsResult.results.map(account => ({
      id: account.id,
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

    // 获取用户分组
    const groupsResult = await groupDb.getGroupsByUserId(c.env.DB, user.id);
    const groups = groupsResult.results.map(group => ({
      id: group.id,
      name: group.name,
      color: group.color,
    }));

    // 获取用户设置
    const userResult = await userDb.findUserById(c.env.DB, user.id);
    let settings = {};
    if (userResult && userResult.settings) {
      try {
        settings = JSON.parse(userResult.settings);
      } catch (e) {
        console.error('解析用户设置失败:', e);
      }
    }

    // 创建备份对象
    const backup = {
      accounts,
      groups,
      settings,
      version: '1.0',
      timestamp: Date.now(),
      userId: user.id, // 仅用于验证，不会包含在响应中
    };

    // 返回备份数据（不包含userId）
    const { userId, ...backupData } = backup;
    return c.json(backupData);
  } catch (error) {
    console.error('创建备份失败:', error);
    return c.json({ error: '创建备份失败' }, 500);
  }
});

// 恢复备份
backupRoutes.post('/restore', zValidator('json', restoreSchema), async (c) => {
  try {
    console.log('收到恢复备份请求');

    const user = c.get('user');
    if (!user || !user.id) {
      console.error('恢复备份失败: 用户未认证');
      return c.json({ error: '用户未认证' }, 401);
    }

    // 验证请求数据
    let validData;
    try {
      validData = c.req.valid('json');
    } catch (validationError) {
      console.error('恢复备份失败: 请求数据验证失败', validationError);
      return c.json({ error: '请求数据格式无效' }, 400);
    }

    const { backup, options } = validData;
    console.log(`恢复备份: 用户ID=${user.id}, 账户数量=${backup.accounts.length}, 有分组=${!!backup.groups}, 有设置=${!!backup.settings}`);

    const overwriteExisting = options?.overwriteExisting || false;
    const mergeSettings = options?.mergeSettings !== false; // 默认为true

    // 开始恢复过程
    let restoredAccounts = 0;
    let restoredGroups = 0;
    let settingsUpdated = false;

    // 1. 恢复分组（如果存在）
    if (backup.groups && backup.groups.length > 0) {
      // 获取现有分组
      const existingGroupsResult = await groupDb.getGroupsByUserId(c.env.DB, user.id);
      const existingGroups = existingGroupsResult.results;
      const existingGroupNames = new Set(existingGroups.map(g => g.name));

      // 处理每个分组
      for (const group of backup.groups) {
        // 检查分组是否已存在
        const groupExists = existingGroupNames.has(group.name);

        if (!groupExists || overwriteExisting) {
          // 创建或更新分组
          const groupId = group.id || crypto.randomUUID();
          await groupDb.createGroup(c.env.DB, {
            id: groupId,
            user_id: user.id,
            name: group.name,
            color: group.color || '#000000',
          });
          restoredGroups++;
        }
      }
    }

    // 2. 恢复账户
    if (backup.accounts && backup.accounts.length > 0) {
      // 获取现有账户
      const existingAccountsResult = await accountDb.getAccountsByUserId(c.env.DB, user.id);
      const existingAccounts = existingAccountsResult.results;
      const existingAccountKeys = new Set(
        existingAccounts.map(a => `${a.issuer || ''}:${a.name}`)
      );

      // 获取更新后的分组映射
      const groupsResult = await groupDb.getGroupsByUserId(c.env.DB, user.id);
      const groupsMap = new Map(groupsResult.results.map(g => [g.name, g.id]));

      // 处理每个账户
      for (const account of backup.accounts) {
        // 生成账户键以检查重复
        const accountKey = `${account.issuer || ''}:${account.name}`;

        // 检查账户是否已存在
        const accountExists = existingAccountKeys.has(accountKey);

        if (!accountExists || overwriteExisting) {
          // 查找分组ID（如果有）
          let groupId = null;
          if (account.groupId) {
            // 尝试使用备份中的分组ID
            const groupExists = await groupDb.getGroupById(c.env.DB, account.groupId, user.id);
            if (groupExists) {
              groupId = account.groupId;
            }
          }

          // 创建账户
          const accountId = account.id || crypto.randomUUID();
          await accountDb.createAccount(c.env.DB, {
            id: accountId,
            user_id: user.id,
            name: account.name,
            issuer: account.issuer === null ? '' : (account.issuer || ''),
            secret: account.secret,
            type: account.type,
            algorithm: account.algorithm === null ? 'SHA1' : (account.algorithm || 'SHA1'),
            digits: account.digits === null ? 6 : (account.digits || 6),
            period: account.period === null ? 30 : (account.period || 30),
            counter: account.counter === null ? 0 : (account.counter || 0),
            group_id: groupId,
            icon: account.icon === null ? '' : (account.icon || ''),
          });
          restoredAccounts++;
        }
      }
    }

    // 3. 恢复用户设置（如果存在）
    if (backup.settings && Object.keys(backup.settings).length > 0) {
      // 获取当前用户设置
      const userResult = await userDb.findUserById(c.env.DB, user.id);
      let currentSettings = {};

      if (userResult && userResult.settings) {
        try {
          currentSettings = JSON.parse(userResult.settings);
        } catch (e) {
          console.error('解析用户设置失败:', e);
        }
      }

      // 合并或覆盖设置
      const newSettings = mergeSettings
        ? { ...currentSettings, ...backup.settings }
        : backup.settings;

      // 更新用户设置
      await userDb.updateUserSettings(c.env.DB, user.id, JSON.stringify(newSettings));
      settingsUpdated = true;
    }

    // 返回恢复结果
    return c.json({
      success: true,
      message: '备份恢复成功',
      restored: {
        accounts: restoredAccounts,
        groups: restoredGroups,
        settings: settingsUpdated,
      },
    });
  } catch (error) {
    console.error('恢复备份失败:', error);

    // 提供更详细的错误信息
    let errorMessage = '恢复备份失败';
    if (error instanceof Error) {
      errorMessage = `恢复备份失败: ${error.message}`;
      console.error(error.stack);
    }

    return c.json({ error: errorMessage }, 500);
  }
});

export { backupRoutes };
