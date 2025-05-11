import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { userDb, webAuthnDb } from '../models/db';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken, verifyToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';
import {
  generateWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
  generateWebAuthnAuthenticationOptions,
  verifyWebAuthnAuthentication,
  WebAuthnCredential
} from '../utils/webauthn';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';

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

// WebAuthn注册选项验证模式
const webAuthnRegisterOptionsSchema = z.object({
  username: z.string(),
});

// WebAuthn注册响应验证模式
const webAuthnRegisterVerifySchema = z.object({
  response: z.any(),
});

// WebAuthn登录选项验证模式
const webAuthnLoginOptionsSchema = z.object({
  username: z.string().optional(),
});

// WebAuthn登录响应验证模式
const webAuthnLoginVerifySchema = z.object({
  response: z.any(),
});

// 获取WebAuthn注册选项
authRoutes.post('/webauthn/register/options', zValidator('json', webAuthnRegisterOptionsSchema), async (c) => {
  const { username } = c.req.valid('json');

  try {
    // 查找用户
    const user = await userDb.findUserByUsername(c.env.DB, username);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    // 获取用户现有的WebAuthn凭证
    const credentialsResult = await webAuthnDb.getCredentialsByUserId(c.env.DB, user.id);
    const credentials = credentialsResult.results.map(cred => ({
      id: cred.id,
      userId: cred.user_id,
      credentialID: cred.credential_id,
      publicKey: cred.public_key,
      counter: cred.counter,
      createdAt: cred.created_at,
      lastUsed: cred.last_used,
    })) as WebAuthnCredential[];

    // 生成注册选项
    const options = await generateWebAuthnRegistrationOptions(user.id, username, credentials);

    // 存储挑战到会话中
    await c.env.SESSIONS.put(`webauthn_challenge_${user.id}`, options.challenge, { expirationTtl: 300 });

    return c.json(options);
  } catch (error) {
    console.error('生成WebAuthn注册选项失败:', error);
    return c.json({ error: '生成WebAuthn注册选项失败' }, 500);
  }
});

// 验证WebAuthn注册
authRoutes.post('/webauthn/register/verify', authMiddleware, zValidator('json', webAuthnRegisterVerifySchema), async (c) => {
  const { response } = c.req.valid('json') as { response: RegistrationResponseJSON };
  const user = c.get('user');

  try {
    // 从会话中获取挑战
    const expectedChallenge = await c.env.SESSIONS.get(`webauthn_challenge_${user.id}`);
    if (!expectedChallenge) {
      return c.json({ error: '注册会话已过期，请重试' }, 400);
    }

    // 验证注册响应
    const verification = await verifyWebAuthnRegistration(response, expectedChallenge);

    if (!verification.verified) {
      return c.json({ error: '验证失败' }, 400);
    }

    // 从验证结果中提取凭证信息
    const { registrationInfo } = verification;
    if (!registrationInfo) {
      return c.json({ error: '注册信息缺失' }, 400);
    }

    // 检查凭证ID是否已存在
    const credentialIdBase64 = Buffer.from(registrationInfo.credentialID).toString('base64url');
    const existingCredential = await webAuthnDb.getCredentialByCredentialId(c.env.DB, credentialIdBase64);
    if (existingCredential) {
      return c.json({ error: '此凭证已注册' }, 400);
    }

    // 保存凭证到数据库
    const credentialId = crypto.randomUUID();
    await webAuthnDb.createCredential(c.env.DB, {
      id: credentialId,
      user_id: user.id,
      credential_id: credentialIdBase64,
      public_key: Buffer.from(registrationInfo.credentialPublicKey).toString('base64url'),
      counter: registrationInfo.counter,
    });

    // 清除会话中的挑战
    await c.env.SESSIONS.delete(`webauthn_challenge_${user.id}`);

    return c.json({
      message: 'WebAuthn注册成功',
      credentialID: credentialIdBase64,
    });
  } catch (error) {
    console.error('WebAuthn注册验证失败:', error);
    return c.json({ error: '注册验证失败' }, 500);
  }
});

// 获取WebAuthn登录选项
authRoutes.post('/webauthn/login/options', zValidator('json', webAuthnLoginOptionsSchema), async (c) => {
  const { username } = c.req.valid('json');

  try {
    let userId: string;

    if (username) {
      // 如果提供了用户名，查找用户
      const user = await userDb.findUserByUsername(c.env.DB, username);
      if (!user) {
        return c.json({ error: '用户不存在' }, 404);
      }
      userId = user.id;
    } else {
      // 如果没有提供用户名，尝试从认证中获取用户ID
      try {
        const authHeader = c.req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const user = await verifyToken(token, c.env.JWT_SECRET);
          userId = user.id;
        } else {
          return c.json({ error: '未提供用户名或认证令牌' }, 400);
        }
      } catch (error) {
        return c.json({ error: '无效的认证令牌' }, 401);
      }
    }

    // 获取用户的WebAuthn凭证
    const credentialsResult = await webAuthnDb.getCredentialsByUserId(c.env.DB, userId);
    const credentials = credentialsResult.results.map(cred => ({
      id: cred.id,
      userId: cred.user_id,
      credentialID: cred.credential_id,
      publicKey: cred.public_key,
      counter: cred.counter,
      createdAt: cred.created_at,
      lastUsed: cred.last_used,
    })) as WebAuthnCredential[];

    if (credentials.length === 0) {
      return c.json({ error: '用户没有注册WebAuthn凭证' }, 400);
    }

    // 生成登录选项
    const options = await generateWebAuthnAuthenticationOptions(credentials);

    // 存储挑战到会话中
    await c.env.SESSIONS.put(`webauthn_challenge_${userId}`, options.challenge, { expirationTtl: 300 });

    return c.json(options);
  } catch (error) {
    console.error('生成WebAuthn登录选项失败:', error);
    return c.json({ error: '生成WebAuthn登录选项失败' }, 500);
  }
});

// 验证WebAuthn登录
authRoutes.post('/webauthn/login/verify', zValidator('json', webAuthnLoginVerifySchema), async (c) => {
  const { response } = c.req.valid('json') as { response: AuthenticationResponseJSON };

  try {
    // 从响应中获取凭证ID
    const credentialIdBase64 = response.id;

    // 查找凭证
    const credential = await webAuthnDb.getCredentialByCredentialId(c.env.DB, credentialIdBase64);
    if (!credential) {
      return c.json({ error: '凭证不存在' }, 404);
    }

    // 查找用户
    const user = await userDb.findUserById(c.env.DB, credential.user_id);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    // 从会话中获取挑战
    const expectedChallenge = await c.env.SESSIONS.get(`webauthn_challenge_${user.id}`);
    if (!expectedChallenge) {
      return c.json({ error: '登录会话已过期，请重试' }, 400);
    }

    // 转换凭证为WebAuthnCredential格式
    const webAuthnCredential: WebAuthnCredential = {
      id: credential.id,
      userId: credential.user_id,
      credentialID: credential.credential_id,
      publicKey: credential.public_key,
      counter: credential.counter,
      createdAt: credential.created_at,
      lastUsed: credential.last_used,
    };

    // 验证登录响应
    const verification = await verifyWebAuthnAuthentication(
      response,
      expectedChallenge,
      webAuthnCredential
    );

    if (!verification.verified) {
      return c.json({ error: '验证失败' }, 400);
    }

    // 更新凭证计数器
    if (verification.authenticationInfo) {
      await webAuthnDb.updateCredentialCounter(
        c.env.DB,
        credential.id,
        verification.authenticationInfo.newCounter
      );
    }

    // 更新用户最后登录时间
    await userDb.updateLastLogin(c.env.DB, user.id);

    // 清除会话中的挑战
    await c.env.SESSIONS.delete(`webauthn_challenge_${user.id}`);

    // 生成JWT令牌
    const token = await generateToken(
      { id: user.id, username: user.username, email: user.email },
      c.env.JWT_SECRET
    );

    return c.json({
      message: 'WebAuthn登录成功',
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  } catch (error) {
    console.error('WebAuthn登录验证失败:', error);
    return c.json({ error: '登录验证失败' }, 500);
  }
});

export { authRoutes };
