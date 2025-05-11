import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { webAuthnDb } from '../models/db';
import { authMiddleware } from '../middleware/auth';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 创建路由
const webAuthnRoutes = new Hono<{ Bindings: Bindings }>();

// 使用认证中间件保护所有路由
webAuthnRoutes.use('*', authMiddleware);

// 获取用户的所有WebAuthn凭证
webAuthnRoutes.get('/credentials', async (c) => {
  const user = c.get('user');

  try {
    // 获取用户的WebAuthn凭证
    const credentialsResult = await webAuthnDb.getCredentialsByUserId(c.env.DB, user.id);

    // 转换为前端友好的格式
    const credentials = credentialsResult.results.map(cred => ({
      id: cred.id,
      credentialId: cred.credential_id,
      createdAt: cred.created_at,
      lastUsed: cred.last_used || null,
      name: cred.name || `凭证 ${cred.id.substring(0, 8)}`,
    }));

    return c.json({ credentials });
  } catch (error) {
    console.error('获取WebAuthn凭证失败:', error);
    return c.json({ error: '获取WebAuthn凭证失败' }, 500);
  }
});

// 更新凭证名称验证模式
const updateCredentialNameSchema = z.object({
  name: z.string().min(1).max(50),
});

// 更新WebAuthn凭证名称
webAuthnRoutes.put('/credentials/:id/name', zValidator('param', z.object({ id: z.string().uuid() })), zValidator('json', updateCredentialNameSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const { name } = c.req.valid('json');

  try {
    // 获取凭证
    const credential = await webAuthnDb.getCredentialByCredentialId(c.env.DB, id);

    // 检查凭证是否存在
    if (!credential) {
      return c.json({ error: '凭证不存在' }, 404);
    }

    // 检查凭证是否属于当前用户
    if (credential.user_id !== user.id) {
      return c.json({ error: '无权更新此凭证' }, 403);
    }

    // 更新凭证名称
    await webAuthnDb.updateCredentialName(c.env.DB, credential.id, name);

    return c.json({
      message: '凭证名称已更新',
      credential: {
        id: credential.id,
        credentialId: credential.credential_id,
        name: name,
      }
    });
  } catch (error) {
    console.error('更新WebAuthn凭证名称失败:', error);
    return c.json({ error: '更新WebAuthn凭证名称失败' }, 500);
  }
});

// 删除凭证验证模式
const deleteCredentialSchema = z.object({
  id: z.string().uuid(),
});

// 删除WebAuthn凭证
webAuthnRoutes.delete('/credentials/:id', zValidator('param', deleteCredentialSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');

  try {
    // 获取凭证
    const credential = await webAuthnDb.getCredentialByCredentialId(c.env.DB, id);

    // 检查凭证是否存在
    if (!credential) {
      return c.json({ error: '凭证不存在' }, 404);
    }

    // 检查凭证是否属于当前用户
    if (credential.user_id !== user.id) {
      return c.json({ error: '无权删除此凭证' }, 403);
    }

    // 删除凭证
    await webAuthnDb.deleteCredential(c.env.DB, credential.id);

    return c.json({ message: '凭证已删除' });
  } catch (error) {
    console.error('删除WebAuthn凭证失败:', error);
    return c.json({ error: '删除WebAuthn凭证失败' }, 500);
  }
});

export { webAuthnRoutes };
