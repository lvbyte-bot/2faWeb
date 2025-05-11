import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { accountDb } from '../models/db';
import { authMiddleware } from '../middleware/auth';
import { TOTP, HOTP } from 'otpauth';

// 定义环境变量类型
type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
};

// 创建路由
const otpRoutes = new Hono<{ Bindings: Bindings }>();

// 使用认证中间件保护所有路由
otpRoutes.use('*', authMiddleware);

// OTP验证模式
const otpVerifySchema = z.object({
  accountId: z.string().uuid(),
  otp: z.string().min(4).max(10),
});

// 获取特定账户的当前OTP码
otpRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    // 获取账户
    const account = await accountDb.getAccountById(c.env.DB, id, user.id);
    if (!account) {
      return c.json({ error: '账户不存在' }, 404);
    }

    // 生成OTP码
    let otp;
    let code;

    if (account.type === 'TOTP') {
      // 创建TOTP实例
      otp = new TOTP({
        issuer: account.issuer,
        label: account.name,
        algorithm: account.algorithm,
        digits: account.digits,
        period: account.period,
        secret: account.secret,
      });

      // 生成TOTP码
      code = otp.generate();

      // 计算剩余时间
      const remaining = otp.period - Math.floor(Date.now() / 1000) % otp.period;

      return c.json({
        code,
        remaining,
        type: 'TOTP',
      });
    } else if (account.type === 'HOTP') {
      // 创建HOTP实例
      otp = new HOTP({
        issuer: account.issuer,
        label: account.name,
        algorithm: account.algorithm,
        digits: account.digits,
        counter: account.counter,
        secret: account.secret,
      });

      // 生成HOTP码
      code = otp.generate();

      return c.json({
        code,
        counter: account.counter,
        type: 'HOTP',
      });
    } else {
      return c.json({ error: '不支持的OTP类型' }, 400);
    }
  } catch (error) {
    console.error('获取OTP码失败:', error);
    return c.json({ error: '获取OTP码失败' }, 500);
  }
});

// 验证OTP码
otpRoutes.post('/verify', zValidator('json', otpVerifySchema), async (c) => {
  try {
    const user = c.get('user');
    const { accountId, otp: code } = c.req.valid('json');

    // 获取账户
    const account = await accountDb.getAccountById(c.env.DB, accountId, user.id);
    if (!account) {
      return c.json({ error: '账户不存在' }, 404);
    }

    // 验证OTP码
    let otpInstance;
    let isValid = false;

    if (account.type === 'TOTP') {
      // 创建TOTP实例
      otpInstance = new TOTP({
        issuer: account.issuer,
        label: account.name,
        algorithm: account.algorithm,
        digits: account.digits,
        period: account.period,
        secret: account.secret,
      });

      // 验证TOTP码
      isValid = otpInstance.validate({ token: code, window: 1 }) !== null;
    } else if (account.type === 'HOTP') {
      // 创建HOTP实例
      otpInstance = new HOTP({
        issuer: account.issuer,
        label: account.name,
        algorithm: account.algorithm,
        digits: account.digits,
        counter: account.counter,
        secret: account.secret,
      });

      // 验证HOTP码
      const delta = otpInstance.validate({ token: code, window: 10 });
      isValid = delta !== null;

      // 如果验证成功，更新计数器
      if (isValid) {
        const newCounter = account.counter + delta + 1;
        await accountDb.updateAccount(c.env.DB, accountId, user.id, {
          counter: newCounter,
        });
      }
    } else {
      return c.json({ error: '不支持的OTP类型' }, 400);
    }

    return c.json({ isValid });
  } catch (error) {
    console.error('验证OTP码失败:', error);
    return c.json({ error: '验证OTP码失败' }, 500);
  }
});

export { otpRoutes };
